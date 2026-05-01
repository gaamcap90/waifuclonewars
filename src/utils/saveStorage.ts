// src/utils/saveStorage.ts
// Versioned, backup-aware save storage for roguelike run state.
//
// Why not direct localStorage.setItem?
//  1. Schema drift — saves from v0.3 can crash v0.5 silently. Versioning lets us
//     migrate or reject old saves explicitly rather than blow up at first access.
//  2. Corruption — if a setItem fails mid-write (quota exceeded, browser crash,
//     OS kill), the slot ends up with partial JSON. Without a backup, the run is
//     gone. We keep the prior-known-good state in a second slot and fall back.
//  3. Silent failures lose trust. Corrupt save → user had no feedback → refund.
//     We surface the error via the onError callback and preserve the backup.

export interface SaveEnvelope<T> {
  version: number;
  savedAt: number;    // ms epoch
  data: T;
}

export type Migration<From, To> = (oldData: From) => To;

export interface SaveStorageOptions<T> {
  /** Base localStorage key. The backup is stored under `${key}__prev`. */
  key: string;
  /** Current schema version. Increment when the shape of T changes. */
  currentVersion: number;
  /** Ordered migrations keyed by source version. Each returns the data in the next version's shape. */
  migrations?: Record<number, Migration<unknown, unknown>>;
  /** Called when the save fails to load cleanly (corrupt / incompatible). */
  onError?: (err: Error, context: 'load' | 'save' | 'migrate') => void;
}

export class SaveStorage<T> {
  private readonly key: string;
  private readonly backupKey: string;
  private readonly currentVersion: number;
  private readonly migrations: Record<number, Migration<unknown, unknown>>;
  private readonly onError: (err: Error, ctx: 'load' | 'save' | 'migrate') => void;

  constructor(opts: SaveStorageOptions<T>) {
    this.key = opts.key;
    this.backupKey = `${opts.key}__prev`;
    this.currentVersion = opts.currentVersion;
    this.migrations = opts.migrations ?? {};
    this.onError = opts.onError ?? (() => {});
  }

  /** Load the current save, migrating if needed. Falls back to backup on corruption. */
  load(): T | null {
    // Try primary slot first
    const primary = this.readSlot(this.key);
    if (primary.kind === 'ok') return primary.data;
    if (primary.kind === 'missing') return null;

    // Primary is corrupt. Try backup.
    const backup = this.readSlot(this.backupKey);
    if (backup.kind === 'ok') {
      this.onError(new Error('primary save corrupt — recovered from backup'), 'load');
      return backup.data;
    }

    // Both corrupt or missing.
    if (backup.kind === 'corrupt') {
      this.onError(new Error('both primary and backup saves are corrupt'), 'load');
    }
    return null;
  }

  /** Save current state. Rotates prior save into backup slot first. */
  save(data: T): boolean {
    const envelope: SaveEnvelope<T> = {
      version: this.currentVersion,
      savedAt: Date.now(),
      data,
    };
    try {
      const serialized = JSON.stringify(envelope);
      // Rotate prior save into backup BEFORE writing new primary.
      // If new write fails, the backup still has the last known good.
      const priorPrimary = localStorage.getItem(this.key);
      if (priorPrimary !== null) {
        try { localStorage.setItem(this.backupKey, priorPrimary); } catch {
          // backup write failed — non-fatal, continue to primary write
        }
      }
      localStorage.setItem(this.key, serialized);
      return true;
    } catch (err) {
      this.onError(err as Error, 'save');
      return false;
    }
  }

  /** Remove both primary and backup slots. */
  clear(): void {
    try { localStorage.removeItem(this.key); } catch {}
    try { localStorage.removeItem(this.backupKey); } catch {}
  }

  /** Returns true if at least one of the two slots contains valid data. */
  hasValidSave(): boolean {
    return this.readSlot(this.key).kind === 'ok' || this.readSlot(this.backupKey).kind === 'ok';
  }

  private readSlot(slotKey: string): { kind: 'ok'; data: T } | { kind: 'missing' } | { kind: 'corrupt' } {
    let raw: string | null;
    try { raw = localStorage.getItem(slotKey); }
    catch { return { kind: 'corrupt' }; }
    if (raw === null) return { kind: 'missing' };

    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { return { kind: 'corrupt' }; }

    // Legacy: pre-envelope saves were raw state objects.
    // Wrap them as version 0 so the migration chain picks them up.
    const envelope: SaveEnvelope<unknown> =
      this.isEnvelope(parsed)
        ? (parsed as SaveEnvelope<unknown>)
        : { version: 0, savedAt: 0, data: parsed };

    if (envelope.version > this.currentVersion) {
      // Future save (newer app version wrote this; we can't read it safely).
      return { kind: 'corrupt' };
    }

    // Run migrations until we reach currentVersion
    let v = envelope.version;
    let data: unknown = envelope.data;
    while (v < this.currentVersion) {
      const migrate = this.migrations[v];
      if (!migrate) {
        // No migration path — can't safely upgrade
        this.onError(new Error(`no migration from v${v}`), 'migrate');
        return { kind: 'corrupt' };
      }
      try { data = migrate(data); }
      catch (err) {
        this.onError(err as Error, 'migrate');
        return { kind: 'corrupt' };
      }
      v++;
    }

    return { kind: 'ok', data: data as T };
  }

  private isEnvelope(x: unknown): x is SaveEnvelope<unknown> {
    return typeof x === 'object' && x !== null
      && 'version' in x && typeof (x as { version: unknown }).version === 'number'
      && 'data'    in x;
  }
}
