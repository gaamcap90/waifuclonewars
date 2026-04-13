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
    # ("beethoven","Beethoven.glb"),  # add when available
    # ("huang",    "Huang.glb"),      # add when available
]

# Render just one character for a test run (set to None to render all)
RENDER_ONLY = None   # e.g. "napoleon"

# ── RENDER SETTINGS ───────────────────────────────────────────────────────────

def setup_render(width, height, filepath):
    scene = bpy.context.scene
    scene.render.engine               = 'BLENDER_EEVEE_NEXT'
    scene.render.film_transparent     = True
    scene.render.image_settings.file_format   = 'PNG'
    scene.render.image_settings.color_mode    = 'RGBA'
    scene.render.image_settings.color_depth   = '8'
    scene.eevee.taa_render_samples    = 64
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
    bg.inputs['Color'].default_value    = (0, 0, 0, 0)
    bg.inputs['Strength'].default_value = 0.0
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])

# ── LIGHTS ────────────────────────────────────────────────────────────────────

RIM_COLORS = {
    "napoleon":  (1.0, 0.82, 0.20),
    "genghis":   (1.0, 0.45, 0.10),
    "davinci":   (0.30, 0.60, 1.0),
    "leonidas":  (0.80, 0.55, 0.20),
    "sunsin":    (0.20, 0.85, 0.75),
    "beethoven": (0.72, 0.30, 1.0),
    "huang":     (0.90, 0.25, 0.15),
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

    upsert_light("WCW_Key",  'AREA', 200,  (1.0, 0.93, 0.82),
                 (-1.8, -1.2, 3.5), (55, -20, 0))
    upsert_light("WCW_Fill", 'AREA', 60,   (0.78, 0.88, 1.0),
                 (2.0,  -1.0, 2.2), (50,  25, 0))
    rim_col = RIM_COLORS.get(char_id, (1, 1, 1))
    upsert_light("WCW_Rim",  'SPOT', 400,  rim_col,
                 (0.2,  2.8, 2.5), (-50,  0, 0), spot_size=45)

# ── CAMERA ────────────────────────────────────────────────────────────────────

def upsert_camera():
    cd = bpy.data.cameras.get("WCW_Cam") or bpy.data.cameras.new("WCW_Cam")
    cd.lens       = 85
    cd.clip_start = 0.01
    cd.clip_end   = 50
    co = bpy.data.objects.get("WCW_Cam")
    if co is None:
        co = bpy.data.objects.new("WCW_Cam", cd)
        bpy.context.scene.collection.objects.link(co)
    bpy.context.scene.camera = co
    return co

def frame_camera(cam_obj, mesh_objects, mode="portrait"):
    """Auto-position camera to frame the character.
    mode='portrait' → bust shot (top 55% of bounding box height)
    mode='sprite'   → full body
    """
    if not mesh_objects:
        return

    # Compute overall bounding box
    min_x = min_y = min_z =  1e9
    max_x = max_y = max_z = -1e9
    for ob in mesh_objects:
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

    if mode == "portrait":
        # Frame from about 40% up to top — bust/three-quarter shot
        focus_z   = min_z + full_h * 0.72
        cam_z     = min_z + full_h * 0.75
        distance  = full_h * 1.1
    else:  # sprite — full body
        focus_z   = min_z + full_h * 0.5
        cam_z     = min_z + full_h * 0.5
        distance  = full_h * 1.5

    cam_obj.location = (cx, cy - distance, cam_z)

    # Point camera at focus point
    import mathutils
    direction = mathutils.Vector((cx, cy, focus_z)) - cam_obj.location
    rot_quat  = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

# ── FREESTYLE ─────────────────────────────────────────────────────────────────

def setup_freestyle():
    scene = bpy.context.scene
    scene.render.use_freestyle = True
    vl = scene.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    for ls in list(fs.linesets):
        fs.linesets.remove(ls)
    ls = fs.linesets.new("WCW_Outline")
    ls.select_silhouette = True
    ls.select_border     = True
    ls.select_crease     = True
    ls.crease_angle      = math.radians(60)
    lstyle = bpy.data.linestyles.get("WCW_Ink") or bpy.data.linestyles.new("WCW_Ink")
    lstyle.color     = (0.02, 0.02, 0.02)
    lstyle.thickness = 1.8
    ls.linestyle     = lstyle

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

    # 3. Lights with character accent color
    setup_lights(char_id)

    # 4. Cam
    cam = upsert_camera()

    # ── PORTRAIT (1024×1024, bust shot) ──────────────────────────────────────
    portrait_path = os.path.join(OUT_DIR, f"{char_id}_portrait.png")
    setup_render(1024, 1024, portrait_path)
    frame_camera(cam, mesh_objects, mode="portrait")
    bpy.ops.render.render(write_still=True)
    print(f"  [OK] Portrait → {portrait_path}")

    # ── SPRITE (256×256, full body) ───────────────────────────────────────────
    sprite_path = os.path.join(OUT_DIR, f"{char_id}_sprite.png")
    setup_render(256, 256, sprite_path)
    frame_camera(cam, mesh_objects, mode="sprite")
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
