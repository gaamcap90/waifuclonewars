"""
Waifu Clone Wars — Batch Render Script
Paste into Blender Scripting tab and Run.
Imports each .glb, renders portrait (1024×1024) + sprite (256×256),
outputs directly to public/art/ ready for the game.
"""

import bpy
import os
import math

# ── PATHS ─────────────────────────────────────────────────────────────────────

GLB_DIR  = r"C:\Users\gaamc\Downloads\WCW\Waifu Art\3D"
OUT_DIR  = r"C:\Users\gaamc\Documents\GitHub\waifuclonewars\public\art"

# Characters to render — (game_id, glb_filename)
CHARACTERS = [
    ("napoleon", "Napoleon.glb"),
    ("genghis",  "Genghis.glb"),
    ("davinci",  "DaVinci.glb"),
    ("leonidas", "Leonidas.glb"),
    ("sunsin",   "Sunsin.glb"),
    ("beethoven","Beethoven.glb"),
    ("huang",    "Huang.glb"),
    ("nelson",   "Nelson.glb"),
    ("hannibal", "Hannibal.glb"),
    ("teddy",    "Teddy.glb"),
    ("mansa",    "Mansa.glb"),
    ("picasso",  "Picasso.glb"),
    # ── all 12 GLBs confirmed present 2026-04-14 ──
]

# Render just one character for a test run (set to None to render all)
RENDER_ONLY = None   # e.g. "napoleon"

# ── PER-CHARACTER FIXES ───────────────────────────────────────────────────────
# Objects to delete after import, keyed by char_id.
# HOW TO FIND THE NAME: import the GLB manually in Blender, open the Outliner,
# expand the collection — each mesh piece is listed by name. Copy it here.
REMOVE_OBJECTS = {
    "nelson": [],   # ← paste arm/hand object name(s) here once you check the Outliner
                    #   e.g. ["Armature_mesh.001", "Hand_R"]
}

# Fix eye whites per character: True = auto-detect and brighten light materials
FIX_EYE_WHITES = {
    "nelson":  True,
    "picasso": True,
}

# Portrait framing tuning — multipliers applied to the auto-calculated distance.
# > 1.0 = pull back (less zoomed), < 1.0 = push in (more zoomed).
# Sprite framing uses the same key but suffix _sprite.
# Portrait distance multipliers — > 1.0 pulls back, < 1.0 pushes in.
# Base distance is full_h * 1.6. Adjust per character as needed.
PORTRAIT_DIST_MULT = {
    "picasso":  2.2,
    "teddy":    1.3,
    "genghis":  2.4,
}

# Sprite distance multipliers — base is full_h * 2.6.
# Use < 1.0 to zoom in (crops sides), > 1.0 to pull back.
SPRITE_DIST_MULT = {
    "huang": 0.80,   # show full trio, empress centered
}

# ── RENDER SETTINGS ───────────────────────────────────────────────────────────

def setup_render(width, height, filepath):
    scene = bpy.context.scene
    # Try EEVEE variants — name changed across Blender versions
    for _engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            scene.render.engine = _engine
            break
        except TypeError:
            continue
    scene.render.film_transparent     = True
    scene.render.image_settings.file_format   = 'PNG'
    scene.render.image_settings.color_mode    = 'RGBA'
    scene.render.image_settings.color_depth   = '8'
    try:
        scene.eevee.taa_render_samples = 64
    except AttributeError:
        pass   # EEVEE Next uses a different samples property; default is fine
    scene.render.resolution_x         = width
    scene.render.resolution_y         = height
    scene.render.resolution_percentage = 100
    scene.render.filepath             = filepath

# ── WORLD — transparent ───────────────────────────────────────────────────────

def setup_world():
    world = bpy.data.worlds.get("WCW_World") or bpy.data.worlds.new("WCW_World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    bg  = nt.nodes.new('ShaderNodeBackground')
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg.inputs['Color'].default_value    = (0, 0, 0, 1)
    bg.inputs['Strength'].default_value = 0.0
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    # Ensure alpha transparency is on (belt-and-suspenders for Blender 5.x)
    bpy.context.scene.render.film_transparent = True
    try:
        bpy.context.scene.view_settings.view_transform = 'Standard'
    except Exception:
        pass

# ── LIGHTS ────────────────────────────────────────────────────────────────────

RIM_COLORS = {
    "napoleon":  (1.0,  0.82, 0.20),   # imperial gold
    "genghis":   (1.0,  0.45, 0.10),   # conquest orange
    "davinci":   (0.30, 0.60, 1.0),    # renaissance blue
    "leonidas":  (0.80, 0.55, 0.20),   # spartan bronze
    "sunsin":    (0.20, 0.85, 0.75),   # sea teal
    "beethoven": (0.72, 0.30, 1.0),    # symphonic violet
    "huang":     (0.90, 0.25, 0.15),   # dynasty red
    "nelson":    (0.10, 0.25, 0.80),   # britannia navy
    "hannibal":  (0.75, 0.55, 0.10),   # carthaginian amber
    "picasso":   (0.15, 0.40, 1.0),    # cobalt blue
    "teddy":     (0.15, 0.65, 0.20),   # forest green
    "mansa":     (0.95, 0.78, 0.05),   # mali gold
}

def setup_lights(char_id):
    scene = bpy.context.scene

    def upsert_light(name, ltype, energy, color, loc, rot_deg, spot_size=None):
        ld = bpy.data.lights.get(name)
        if ld is None:
            ld = bpy.data.lights.new(name, ltype)
        ld.energy = energy
        ld.color  = color
        if ltype == 'AREA':
            ld.size = 1.5
        if spot_size is not None:
            ld.spot_size  = math.radians(spot_size)
            ld.spot_blend = 0.3
        lo = bpy.data.objects.get(name)
        if lo is None:
            lo = bpy.data.objects.new(name, ld)
            scene.collection.objects.link(lo)
        lo.location       = loc
        lo.rotation_euler = tuple(math.radians(d) for d in rot_deg)
        return lo

    # Characters with dark uniforms/skin need a brighter key light
    BRIGHT_BOOST = {"nelson", "hannibal", "mansa", "teddy"}
    key_energy  = 320 if char_id in BRIGHT_BOOST else 200
    fill_energy = 100 if char_id in BRIGHT_BOOST else 60

    upsert_light("WCW_Key",  'AREA', key_energy,  (1.0, 0.93, 0.82),
                 (-1.8, -1.2, 3.5), (55, -20, 0))
    upsert_light("WCW_Fill", 'AREA', fill_energy, (0.78, 0.88, 1.0),
                 (2.0,  -1.0, 2.2), (50,  25, 0))
    rim_col = RIM_COLORS.get(char_id, (1, 1, 1))
    upsert_light("WCW_Rim",  'SPOT', 400,  rim_col,
                 (0.2,  2.8, 2.5), (-50,  0, 0), spot_size=45)

# ── CAMERA ────────────────────────────────────────────────────────────────────

def upsert_camera(lens=85):
    cd = bpy.data.cameras.get("WCW_Cam") or bpy.data.cameras.new("WCW_Cam")
    cd.lens       = lens
    cd.clip_start = 0.01
    cd.clip_end   = 50
    co = bpy.data.objects.get("WCW_Cam")
    if co is None:
        co = bpy.data.objects.new("WCW_Cam", cd)
        bpy.context.scene.collection.objects.link(co)
    bpy.context.scene.camera = co
    return co

def frame_camera(cam_obj, mesh_objects, mode="portrait", char_id=""):
    """Auto-position camera to frame the character.
    mode='portrait' → bust shot (top 55% of bounding box height)
    mode='sprite'   → full body including pedestal
    """
    if not mesh_objects:
        return

    # For sprite mode, include the pedestal in the bounding box so it's in frame
    if mode == "sprite":
        ped = bpy.data.objects.get("WCW_Pedestal")
        frame_objects = mesh_objects + ([ped] if ped else [])
    else:
        frame_objects = mesh_objects

    # Compute overall bounding box
    min_x = min_y = min_z =  1e9
    max_x = max_y = max_z = -1e9
    for ob in frame_objects:
        for corner in ob.bound_box:
            world_co = ob.matrix_world @ __import__('mathutils').Vector(corner)
            min_x = min(min_x, world_co.x)
            min_y = min(min_y, world_co.y)
            min_z = min(min_z, world_co.z)
            max_x = max(max_x, world_co.x)
            max_y = max(max_y, world_co.y)
            max_z = max(max_z, world_co.z)

    cx   = (min_x + max_x) / 2
    cy   = (min_y + max_y) / 2
    full_h = max_z - min_z

    dist_mult = SPRITE_DIST_MULT.get(char_id, 1.0) if mode == "sprite" else PORTRAIT_DIST_MULT.get(char_id, 1.0)

    if mode == "portrait":
        # Bust shot — frame top 60% of character (head + chest)
        focus_z   = min_z + full_h * 0.72
        cam_z     = min_z + full_h * 0.75
        distance  = full_h * 1.6 * dist_mult
    else:  # sprite — full body, bounding box already includes pedestal via frame_objects
        # Center vertically on the full extent (hat tip → pedestal base)
        mid_z    = (min_z + max_z) / 2
        focus_z  = mid_z
        cam_z    = mid_z
        distance = full_h * 2.6 * dist_mult

    cam_obj.location = (cx, cy - distance, cam_z)

    # Point camera at focus point
    import mathutils
    direction = mathutils.Vector((cx, cy, focus_z)) - cam_obj.location
    rot_quat  = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

# ── FREESTYLE ─────────────────────────────────────────────────────────────────

def setup_freestyle():
    # Freestyle is disabled — it composites ink on a black background which
    # kills the alpha channel on transparent PNGs. Chibi models read cleanly
    # without outlines. Re-enable here if you switch to an opaque background.
    scene = bpy.context.scene
    scene.render.use_freestyle = False
    vl = scene.view_layers[0]
    vl.use_freestyle = False

# ── PER-CHARACTER FIX PASSES ──────────────────────────────────────────────────

def apply_char_fixes(char_id, mesh_objects):
    """Run any character-specific mesh/material corrections after import."""

    # ── Remove specified objects (e.g. stray arm on Nelson) ───────────────────
    for obj_name in REMOVE_OBJECTS.get(char_id, []):
        ob = bpy.data.objects.get(obj_name)
        if ob:
            bpy.data.objects.remove(ob, do_unlink=True)
            print(f"  [FIX] Removed object: {obj_name}")
        else:
            print(f"  [WARN] Object to remove not found: {obj_name}")

    # ── Fix eye whites ─────────────────────────────────────────────────────────
    # Detects materials whose Principled BSDF base color is near-white (R,G,B > 0.7)
    # and boosts them so they read as bright sclera rather than grey.
    if FIX_EYE_WHITES.get(char_id):
        for ob in mesh_objects:
            for slot in ob.material_slots:
                mat = slot.material
                if not mat or not mat.use_nodes:
                    continue
                bsdf = mat.node_tree.nodes.get("Principled BSDF")
                if not bsdf:
                    continue
                col = bsdf.inputs["Base Color"].default_value
                # Heuristic: all RGB channels > 0.88 → near-pure white = sclera
                if col[0] > 0.88 and col[1] > 0.88 and col[2] > 0.88:
                    bsdf.inputs["Base Color"].default_value = (0.95, 0.95, 0.95, 1.0)
                    bsdf.inputs["Roughness"].default_value  = 0.05
                    bsdf.inputs["Metallic"].default_value   = 0.0
                    # Small emission so it doesn't go grey under dark lighting
                    emit_node = mat.node_tree.nodes.get("Emission")
                    if not emit_node:
                        emit_node = mat.node_tree.nodes.new("ShaderNodeEmission")
                    emit_node.inputs["Color"].default_value    = (1.0, 1.0, 1.0, 1.0)
                    emit_node.inputs["Strength"].default_value = 0.25
                    # Mix emission into BSDF output
                    mix = mat.node_tree.nodes.new("ShaderNodeMixShader")
                    mix.inputs["Fac"].default_value = 0.2
                    out = mat.node_tree.nodes.get("Material Output")
                    if out:
                        mat.node_tree.links.new(bsdf.outputs["BSDF"],       mix.inputs[1])
                        mat.node_tree.links.new(emit_node.outputs["Emission"], mix.inputs[2])
                        mat.node_tree.links.new(mix.outputs["Shader"],      out.inputs["Surface"])
                    print(f"  [FIX] Eye-white boosted on material: {mat.name}")


# ── WH40K PEDESTAL ────────────────────────────────────────────────────────────

def create_pedestal(mesh_objects):
    """Create a Warhammer 40K-style round miniature base under the character.

    Round beveled disc, matte black, sized to the character's XY footprint.
    Sits flush at the character's feet (min_z) so it reads as their base.
    The pedestal object is tagged WCW_Pedestal so clear_imported() removes it
    between characters.
    """
    import mathutils

    # ── Compute character bounding box ────────────────────────────────────────
    min_x = min_y = min_z =  1e9
    max_x = max_y          = -1e9
    for ob in mesh_objects:
        for corner in ob.bound_box:
            wc = ob.matrix_world @ mathutils.Vector(corner)
            min_x = min(min_x, wc.x);  max_x = max(max_x, wc.x)
            min_y = min(min_y, wc.y);  max_y = max(max_y, wc.y)
            min_z = min(min_z, wc.z)

    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2

    # Radius ≈ 45% of the wider XY extent, clamped to a sensible range
    footprint = max(max_x - min_x, max_y - min_y)
    radius    = max(0.06, min(0.28, footprint * 0.45))
    thickness = 0.035   # ~35mm in Blender metres (character scale ~1.7m ≈ 1.7 units)

    # ── Create cylinder ───────────────────────────────────────────────────────
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64,
        radius=radius,
        depth=thickness,
        location=(cx, cy, min_z - thickness / 2),
    )
    ped = bpy.context.active_object
    ped.name = "WCW_Pedestal"

    # ── Bevel modifier — rounds the top/bottom edge ───────────────────────────
    bev = ped.modifiers.new("Bevel", "BEVEL")
    bev.width          = 0.005
    bev.segments       = 3
    bev.limit_method   = 'ANGLE'
    bev.angle_limit    = math.radians(60)
    bev.profile        = 0.5    # circular profile

    # ── Matte black material ──────────────────────────────────────────────────
    mat = bpy.data.materials.get("WCW_PedestalMat")
    if mat is None:
        mat = bpy.data.materials.new("WCW_PedestalMat")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.03, 0.03, 0.03, 1.0)
            bsdf.inputs["Roughness"].default_value  = 0.75
            bsdf.inputs["Metallic"].default_value   = 0.0
            bsdf.inputs["Specular IOR Level"].default_value = 0.1

    if ped.data.materials:
        ped.data.materials[0] = mat
    else:
        ped.data.materials.append(mat)

    return ped


# ── SCENE CLEAR ───────────────────────────────────────────────────────────────

def clear_imported():
    """Remove all mesh/armature objects from previous import, keep lights+camera."""
    keep = {"WCW_Key", "WCW_Fill", "WCW_Rim", "WCW_Cam"}
    for ob in list(bpy.data.objects):
        if ob.name not in keep and ob.type in {'MESH', 'ARMATURE', 'EMPTY', 'CURVE'}:
            bpy.data.objects.remove(ob, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)

# ── MAIN RENDER LOOP ──────────────────────────────────────────────────────────

def render_character(char_id, glb_path):
    print(f"\n{'═'*50}")
    print(f"  Rendering: {char_id}")
    print(f"  GLB: {glb_path}")
    print(f"{'═'*50}")

    if not os.path.exists(glb_path):
        print(f"  [SKIP] File not found: {glb_path}")
        return

    # 1. Clear previous character
    clear_imported()

    # 2. Import GLB
    bpy.ops.import_scene.gltf(filepath=glb_path)

    # Rotate to face camera (GLB forward is +Y, we need -Y toward cam)
    for ob in bpy.context.selected_objects:
        if ob.type == 'ARMATURE':
            ob.rotation_euler.z = math.radians(180)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
            break

    mesh_objects = [ob for ob in bpy.data.objects
                    if ob.type == 'MESH' and ob.name not in {"WCW_Key","WCW_Fill","WCW_Rim","WCW_Cam"}]

    if not mesh_objects:
        print(f"  [WARN] No mesh objects found after import")
        return

    # 3. Per-character fixes (arm removal, eye whites, etc.)
    apply_char_fixes(char_id, mesh_objects)
    # Refresh mesh list in case objects were removed
    mesh_objects = [ob for ob in bpy.data.objects
                    if ob.type == 'MESH' and ob.name not in {"WCW_Key","WCW_Fill","WCW_Rim","WCW_Cam","WCW_Pedestal"}]

    # 4. WH40K pedestal base
    create_pedestal(mesh_objects)

    # 4. Lights with character accent color
    setup_lights(char_id)

    # ── 3D BUST (1024×1024) — Archives viewer ─────────────────────────────────
    bust_path = os.path.join(OUT_DIR, f"{char_id}_3d.png")
    setup_render(1024, 1024, bust_path)
    cam = upsert_camera(lens=85)   # telephoto for flattering bust shot
    frame_camera(cam, mesh_objects, mode="portrait", char_id=char_id)
    bpy.ops.render.render(write_still=True)
    print(f"  [OK] 3D bust  → {bust_path}")

    # ── SPRITE (512×512, full body + pedestal) — game board ───────────────────
    sprite_path = os.path.join(OUT_DIR, f"{char_id}_sprite.png")
    setup_render(512, 512, sprite_path)
    cam = upsert_camera(lens=60)   # wider lens fits hat + pedestal in frame
    frame_camera(cam, mesh_objects, mode="sprite", char_id=char_id)
    bpy.ops.render.render(write_still=True)
    print(f"  [OK] Sprite   → {sprite_path}")


def main():
    setup_world()
    setup_freestyle()

    for char_id, glb_file in CHARACTERS:
        if RENDER_ONLY and char_id != RENDER_ONLY:
            continue
        glb_path = os.path.join(GLB_DIR, glb_file)
        render_character(char_id, glb_path)

    print("\n✓ All renders complete. Check public/art/ in the game repo.")


main()
