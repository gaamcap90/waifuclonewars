"""
wcw_terrain_render.py — Waifu Clone Wars Terrain Tile Renderer
================================================================
Renders 512×512 PNG terrain tiles from procedurally generated 3D geometry.
Each tile is output as a transparent PNG ready to replace the existing flat
photos in /public/art/tiles/.

The game clips tile PNGs to a flat-top hex shape (SVG polygon):
  25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%
So the rendered square image is automatically masked — fill the whole frame.

Usage (inside Blender):
  1. Open Blender (any recent 3.x or 4.x)
  2. Go to Scripting tab → Open this file
  3. Press Run Script
  4. Tiles are written to OUT_DIR (created automatically)

To render just one tile:   set RENDER_ONLY = "forest"
To render a subset:        set RENDER_ONLY = ["plain", "lake", "ice", "desert"]
To render all 14 tiles:    set RENDER_ONLY = None
"""

import bpy
import math
import os
import random
from mathutils import Vector

# ── CONFIGURATION ─────────────────────────────────────────────────────────────

# Output folder — tiles land here. Swap into /tiles/ root when happy with results.
OUT_DIR     = r"C:\Users\gaamc\Documents\GitHub\waifuclonewars\public\art\tiles\3d"
RENDER_ONLY = None      # e.g. "forest" | "mana_crystal" | None = all
# ── QUICK RE-RENDER: set to a list to render specific tiles only ───────────────
# RENDER_ONLY = "plain"   # single tile
# Run all 4 changed tiles by temporarily uncommenting and setting None above

TILE_RES = 512          # square output resolution
SAMPLES  = 72           # EEVEE TAA samples (raise to 128 for final)

# ── ISOMETRIC CAMERA ──────────────────────────────────────────────────────────
# Low-angle view so tall geometry (spires, peaks, obelisks) fills the hex
# vertically — giving readable silhouettes at small in-game tile sizes.
# Elevation angle ≈ arctan(CAM_HEIGHT / CAM_Y_BACK) ≈ 38° from horizontal.
CAM_HEIGHT  = 3.5       # world-units above origin
CAM_Y_BACK  = 4.5       # world-units behind origin  (isometric side-angle)
CAM_LENS    = 70        # mm — slightly wider than telephoto for more drama

# Hex tile geometry
HEX_R     = 1.00        # hex tile radius (flat-top, matching game layout)
HEX_DEPTH = 0.20        # thicker slab so the front edge reads at low angle

# ── TERRAIN DEFINITIONS ───────────────────────────────────────────────────────
# (terrain_id, output_filename, rim_color_RGB, builder_fn_name, cam_y_back)
# cam_y_back: pull camera back further for very tall geometry so nothing clips.
# None → global CAM_Y_BACK.
TERRAINS = [
    ("forest",       "Forest_3d.png",       (0.08, 0.90, 0.30), "build_forest",       5.8),
    ("mountain",     "Mountains_3d.png",    (0.55, 0.60, 0.65), "build_mountain",     5.4),
    ("river",        "River_3d.png",        (0.18, 0.62, 0.92), "build_river",        None),
    ("plain",        "Plains_3d.png",       (0.32, 0.72, 0.22), "build_plain",        None),
    ("mana_crystal", "Mana_Crystal_3d.png", (0.65, 0.15, 1.00), "build_mana_crystal", 5.0),
    ("base_blue",    "Blue_Base_3d.png",    (0.15, 0.40, 1.00), "build_base_blue",    5.0),
    ("base_red",     "Red_Base_3d.png",     (1.00, 0.18, 0.12), "build_base_red",     5.0),
    ("spawn_blue",   "Spawn_Blue_3d.png",   (0.22, 0.58, 1.00), "build_spawn_blue",   None),
    ("spawn_red",    "Spawn_Red_3d.png",    (1.00, 0.32, 0.18), "build_spawn_red",    None),
    ("lake",         "Lake_3d.png",         (0.08, 0.28, 0.78), "build_lake",         None),
    ("desert",       "Desert_3d.png",       (0.95, 0.55, 0.10), "build_desert",       5.2),
    ("snow",         "Snow_3d.png",         (0.55, 0.82, 1.00), "build_snow",         5.0),
    ("ice",          "Ice_3d.png",          (0.48, 0.82, 1.00), "build_ice",          None),
    ("mud",          "Mud_3d.png",          (0.38, 0.22, 0.08), "build_mud",          None),
]

# ── SCENE UTILITIES ───────────────────────────────────────────────────────────

def clear_scene():
    """Remove everything — call once before first tile."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)


def clear_terrain_objects():
    """Remove only mesh objects; keep camera and lights."""
    for obj in list(bpy.data.objects):
        if obj.type == 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)


def _set_bsdf_input(bsdf, value, *names):
    """Try each name in order; set the first that exists. Version-safe."""
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return


def make_material(name, color, roughness=0.80, metallic=0.0, specular=0.5,
                  emission=None, emission_strength=3.5,
                  alpha=1.0, transmission=0.0, ior=1.45):
    """Create a Principled BSDF material. Works on Blender 3.x and 4.x."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")

    r, g, b = color
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value  = roughness
    bsdf.inputs["Metallic"].default_value   = metallic

    _set_bsdf_input(bsdf, specular,      "Specular", "Specular IOR Level")
    _set_bsdf_input(bsdf, transmission,  "Transmission", "Transmission Weight")
    _set_bsdf_input(bsdf, ior,           "IOR")

    if emission:
        er, eg, eb = emission
        _set_bsdf_input(bsdf, (er, eg, eb, 1.0), "Emission", "Emission Color")
        _set_bsdf_input(bsdf, emission_strength,  "Emission Strength")

    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        bsdf.inputs["Alpha"].default_value = alpha

    return mat


def assign_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


# ── GEOMETRY HELPERS ──────────────────────────────────────────────────────────

def make_hex_base(color=(0.15, 0.35, 0.12), roughness=0.85, metallic=0.0):
    """
    Flat-top hexagonal tile slab.
    A 6-sided Blender cylinder starts pointy-top; rotating 30° gives flat-top.
    """
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=HEX_R, depth=HEX_DEPTH, location=(0, 0, 0)
    )
    obj = bpy.context.active_object
    obj.name = "hex_base"
    obj.rotation_euler[2] = math.radians(30)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material("hex_base_mat", color, roughness=roughness, metallic=metallic)
    assign_mat(obj, mat)
    return obj


def add_disc(radius, z, color, roughness=0.88, name="disc",
             emission=None, emission_strength=3.5,
             alpha=1.0, specular=0.5, transmission=0.0, ior=1.45):
    """Flat filled circle (good for water, ground covers, emblems)."""
    bpy.ops.mesh.primitive_circle_add(
        vertices=32, radius=radius, fill_type='TRIFAN',
        location=(0, 0, HEX_DEPTH / 2 + z)
    )
    obj = bpy.context.active_object
    obj.name = name
    mat = make_material(name + "_mat", color, roughness=roughness, specular=specular,
                        emission=emission, emission_strength=emission_strength,
                        alpha=alpha, transmission=transmission, ior=ior)
    assign_mat(obj, mat)
    return obj


# ── TERRAIN BUILDERS ──────────────────────────────────────────────────────────

def build_plain():
    """Alien gladiatorial arena floor — battle-scarred dark stone with glowing energy fissures."""
    make_hex_base(color=(0.22, 0.20, 0.30), roughness=0.78, metallic=0.15)
    z0 = HEX_DEPTH / 2
    # Stone arena surface
    add_disc(0.90, 0.002, (0.26, 0.24, 0.34), roughness=0.82, name="arena_stone")
    # Central arena rune — small subtle origin marker
    add_disc(0.09, 0.004, (0.25, 0.90, 1.00), roughness=0.20,
             emission=(0.20, 0.85, 1.00), emission_strength=5.0, name="arena_rune")
    # Energy fissures — diagonal cracks NOT symmetric (battle-worn, not a bullseye)
    # (angle_deg, length, center_offset_x, center_offset_y)
    fissures = [
        ( 22, 0.74,  0.05,  0.02),   # main long crack — cyan
        (105, 0.56, -0.06, -0.05),   # cross crack — gold
        (162, 0.62,  0.02,  0.04),   # diagonal — cyan
        (248, 0.48,  0.08, -0.04),   # short — gold
        (310, 0.42, -0.06,  0.05),   # short — cyan
        ( 58, 0.34,  0.14,  0.20),   # secondary branch — cyan
    ]
    for i, (ang, length, ox, oy) in enumerate(fissures):
        a = math.radians(ang)
        cx = ox + (length / 2) * math.cos(a)
        cy = oy + (length / 2) * math.sin(a)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=4, radius=0.011, depth=length,
            location=(cx, cy, z0 + 0.014)
        )
        crack = bpy.context.active_object
        crack.rotation_euler[2] = a + math.pi / 2
        bpy.ops.object.transform_apply(rotation=True)
        crack_col = (0.15, 0.70, 1.00) if i % 2 == 0 else (1.00, 0.72, 0.10)
        mat = make_material(f"fissure_{i}", crack_col, roughness=0.08,
                            emission=crack_col, emission_strength=3.8)
        assign_mat(crack, mat)
    # Hex-vertex floor markers — small glow dots at arena corners
    for j in range(6):
        fa = j * math.pi / 3 + math.pi / 6   # flat-top hex vertex angles
        mx, my = 0.68 * math.cos(fa), 0.68 * math.sin(fa)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.020, location=(mx, my, z0 + 0.016))
        marker = bpy.context.active_object
        mc = (0.20, 0.85, 1.00) if j % 3 != 1 else (1.00, 0.72, 0.08)
        mat = make_material(f"marker_{j}", mc, roughness=0.10,
                            emission=mc, emission_strength=4.0)
        assign_mat(marker, mat)


def build_forest():
    """Alien crystal grove — Znyxorga energy spires blazing on dark void stone."""
    # Deep void base — dark but visible from isometric angle
    make_hex_base(color=(0.06, 0.05, 0.14), roughness=0.75)
    z0 = HEX_DEPTH / 2
    # Dark void stone floor
    add_disc(0.90, 0.002, (0.08, 0.06, 0.18), roughness=0.88, name="void_floor")
    # Central summoning rune ring — blazing cyan
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.28, minor_radius=0.020,
        major_segments=24, minor_segments=6,
        location=(0, 0, z0 + 0.020)
    )
    rune_ring = bpy.context.active_object
    mat = make_material("rune_ring", (0.01, 0.01, 0.02), roughness=0.05,
                        emission=(0.15, 0.80, 1.00), emission_strength=6.0)
    assign_mat(rune_ring, mat)
    # Inner rune disc — slightly different hue
    add_disc(0.12, 0.005, (0.01, 0.01, 0.02), roughness=0.08,
             emission=(0.35, 0.90, 1.00), emission_strength=5.0, name="rune_disc")

    # Crystal spires — near-BLACK base so glow is the ONLY colour source
    # (x, y, total_height, base_radius, glow_color)
    spires = [
        ( 0.00,  0.05, 0.80, 0.090, (0.15, 0.85, 1.00)),   # main — blazing cyan
        (-0.32,  0.22, 0.55, 0.072, (0.75, 0.08, 1.00)),   # left — vivid purple
        ( 0.30, -0.20, 0.64, 0.076, (0.15, 0.80, 1.00)),   # right — cyan
        (-0.14, -0.38, 0.40, 0.054, (0.90, 0.18, 1.00)),   # front-left — violet
        ( 0.42,  0.30, 0.34, 0.050, (1.00, 0.80, 0.05)),   # back-right — gold
        (-0.48, -0.10, 0.30, 0.044, (0.55, 0.06, 0.92)),   # far left — deep violet
    ]
    dark = (0.01, 0.01, 0.02)   # shared near-black base for all spires
    for i, (sx, sy, sh, sr, col) in enumerate(spires):
        shaft_h = sh * 0.65
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=6, radius=sr, depth=shaft_h,
            location=(sx, sy, z0 + shaft_h / 2)
        )
        shaft = bpy.context.active_object
        shaft.rotation_euler[2] = random.uniform(0, math.pi)
        bpy.ops.object.transform_apply(rotation=True)
        # Filmic sweet spot: 3-5 keeps colour, above 8 blows to white
        mat = make_material(f"spire_shaft_{i}", dark, roughness=0.04, specular=0.99,
                            emission=col, emission_strength=4.5)
        assign_mat(shaft, mat)
        # Tip brighter but still under blowout threshold
        tip_h = sh * 0.38
        bpy.ops.mesh.primitive_cone_add(
            vertices=6, radius1=sr, radius2=0.0,
            depth=tip_h, location=(sx, sy, z0 + shaft_h + tip_h / 2)
        )
        tip = bpy.context.active_object
        tip.rotation_euler[2] = random.uniform(0, math.pi)
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material(f"spire_tip_{i}", dark, roughness=0.02, specular=0.99,
                            emission=col, emission_strength=7.0)
        assign_mat(tip, mat)

    # Energy node orbs
    orb_data = [
        (-0.56,  0.08, 0.060, (0.15, 0.85, 1.00)),   # cyan
        ( 0.56, -0.28, 0.056, (0.78, 0.08, 1.00)),   # purple
        ( 0.10,  0.60, 0.052, (1.00, 0.80, 0.05)),   # gold
        (-0.38, -0.52, 0.048, (0.55, 0.06, 0.92)),   # deep violet
    ]
    for i, (ox, oy, or_, col) in enumerate(orb_data):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=or_, location=(ox, oy, z0 + or_))
        orb = bpy.context.active_object
        mat = make_material(f"orb_{i}", dark, roughness=0.05,
                            emission=col, emission_strength=5.5)
        assign_mat(orb, mat)


def build_mountain():
    """Volcanic cosmic peak — dark basalt with blazing magma veins. Znyxorga volcanic."""
    # Medium-dark purple-grey base so facets actually read
    make_hex_base(color=(0.18, 0.14, 0.20), roughness=0.90)
    z0 = HEX_DEPTH / 2
    # Cosmic energy void at base — deep purple-black with faint cyan glow
    add_disc(0.82, 0.002, (0.04, 0.03, 0.10), roughness=0.30,
             emission=(0.10, 0.40, 1.00), emission_strength=1.5, name="void_pool")
    # Rocky ground ring on top (partially covers void at edges)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.70, minor_radius=0.12,
        major_segments=24, minor_segments=6,
        location=(0, 0, z0 + 0.010)
    )
    rock_ring = bpy.context.active_object
    mat = make_material("rock_ring", (0.24, 0.18, 0.26), roughness=0.90)
    assign_mat(rock_ring, mat)
    # Main central peak — medium grey-purple basalt so facets are visible
    bpy.ops.mesh.primitive_cone_add(
        vertices=7, radius1=0.58, radius2=0.04,
        depth=0.88, location=(0, 0.04, z0 + 0.44)
    )
    peak = bpy.context.active_object
    peak.rotation_euler[2] = math.radians(18)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material("peak", (0.28, 0.22, 0.32), roughness=0.86)
    assign_mat(peak, mat)
    # Magma glow seam across peak face — fat glowing band
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.24, minor_radius=0.030,
        major_segments=20, minor_segments=6,
        location=(0.02, 0.02, z0 + 0.52)
    )
    peak_seam = bpy.context.active_object
    mat = make_material("peak_seam", (1.00, 0.30, 0.02), roughness=0.08,
                        emission=(1.00, 0.22, 0.01), emission_strength=8.0)
    assign_mat(peak_seam, mat)
    # Left flanking rock — lighter than before
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.30, radius2=0.02,
        depth=0.42, location=(-0.44, -0.18, z0 + 0.21)
    )
    fl = bpy.context.active_object
    fl.rotation_euler[2] = math.radians(42)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material("flank_l", (0.22, 0.17, 0.25), roughness=0.90)
    assign_mat(fl, mat)
    # Right flanking rock
    bpy.ops.mesh.primitive_cone_add(
        vertices=5, radius1=0.20, radius2=0.01,
        depth=0.30, location=(0.46, 0.22, z0 + 0.15)
    )
    fr = bpy.context.active_object
    fr.rotation_euler[2] = math.radians(68)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material("flank_r", (0.22, 0.17, 0.26), roughness=0.90)
    assign_mat(fr, mat)
    # Fat lava seam spokes radiating from peak base
    for i, angle_deg in enumerate([10, 75, 150, 230, 300]):
        a = math.radians(angle_deg)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=4, radius=0.022, depth=0.50,
            location=(0.20 * math.cos(a), 0.20 * math.sin(a), z0 + 0.012)
        )
        seam = bpy.context.active_object
        seam.rotation_euler[2] = a + math.pi / 2
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material(f"lava_{i}", (1.00, 0.28, 0.02), roughness=0.08,
                            emission=(1.00, 0.20, 0.01), emission_strength=7.0)
        assign_mat(seam, mat)


def build_river():
    """Cosmic plasma channel — glowing energy current cutting through alien stone."""
    make_hex_base(color=(0.12, 0.10, 0.22), roughness=0.86)
    z0 = HEX_DEPTH / 2
    # Dark stone banks
    add_disc(0.85, 0.002, (0.16, 0.13, 0.28), roughness=0.88, name="stone_base")
    # Plasma channel body (narrow elliptical disc)
    bpy.ops.mesh.primitive_circle_add(
        vertices=32, radius=0.78, fill_type='TRIFAN',
        location=(0, 0, z0 + 0.006)
    )
    channel = bpy.context.active_object
    channel.scale = (0.32, 1.0, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    mat = make_material("plasma_channel", (0.20, 0.70, 1.00), roughness=0.02,
                        specular=0.98, emission=(0.15, 0.60, 1.00), emission_strength=3.5,
                        alpha=0.94, transmission=0.50, ior=1.10)
    assign_mat(channel, mat)
    # Bright plasma core (even narrower, more intense)
    bpy.ops.mesh.primitive_circle_add(
        vertices=32, radius=0.72, fill_type='TRIFAN',
        location=(0, 0, z0 + 0.010)
    )
    core = bpy.context.active_object
    core.scale = (0.16, 1.0, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    mat = make_material("plasma_core", (0.50, 0.90, 1.00), roughness=0.01,
                        emission=(0.40, 0.85, 1.00), emission_strength=7.0,
                        alpha=0.90, transmission=0.60, ior=1.05)
    assign_mat(core, mat)
    # Plasma energy nodes (glowing orbs floating above channel)
    node_positions = [
        ( 0.00,  0.42, 0.06),
        ( 0.00, -0.42, 0.06),
        ( 0.00,  0.14, 0.08),
        ( 0.00, -0.14, 0.08),
    ]
    for i, (nx, ny, nz) in enumerate(node_positions):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.042, location=(nx, ny, z0 + nz))
        node = bpy.context.active_object
        node.scale = (1.0, 1.0, 0.65)
        bpy.ops.object.transform_apply(scale=True)
        mat = make_material(f"node_{i}", (0.40, 0.88, 1.00), roughness=0.08,
                            emission=(0.35, 0.80, 1.00), emission_strength=8.0)
        assign_mat(node, mat)
    # Stone channel walls (thin raised strips on either side)
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=4, radius=0.014, depth=1.50,
            location=(side * 0.26, 0, z0 + 0.020)
        )
        wall = bpy.context.active_object
        wall.rotation_euler[0] = math.radians(90)
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material(f"wall_{side}", (0.15, 0.12, 0.22), roughness=0.75)
        assign_mat(wall, mat)


def build_lake():
    """Cosmic energy lake — same water hue as river plasma channel, wider still body."""
    make_hex_base(color=(0.12, 0.10, 0.22), roughness=0.90)
    z0 = HEX_DEPTH / 2
    # Dark alien stone shore
    add_disc(0.90, 0.002, (0.16, 0.13, 0.28), roughness=0.88, name="shore")
    # Wide energy water body — same cyan-blue hue as the river channel
    add_disc(0.72, 0.007, (0.08, 0.35, 0.85), roughness=0.03, specular=0.96,
             emission=(0.06, 0.40, 1.00), emission_strength=1.8,
             transmission=0.45, ior=1.33, alpha=0.95, name="lake_water")
    # Bright inner core
    add_disc(0.36, 0.012, (0.28, 0.68, 1.00), roughness=0.02, specular=0.98,
             emission=(0.18, 0.58, 1.00), emission_strength=4.0,
             alpha=0.90, transmission=0.55, ior=1.10, name="lake_core")
    # Central energy geyser — tall vertical element visible at isometric angle
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=0.055, depth=0.55,
        location=(0, 0, z0 + 0.275)
    )
    geyser = bpy.context.active_object
    mat = make_material("geyser", (0.20, 0.65, 1.00), roughness=0.04,
                        emission=(0.12, 0.55, 1.00), emission_strength=5.5,
                        alpha=0.82, transmission=0.60, ior=1.10)
    assign_mat(geyser, mat)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.095, location=(0, 0, z0 + 0.60))
    gtip = bpy.context.active_object
    mat = make_material("geyser_tip", (0.40, 0.80, 1.00), roughness=0.04,
                        emission=(0.25, 0.70, 1.00), emission_strength=7.0,
                        alpha=0.78, transmission=0.55, ior=1.05)
    assign_mat(gtip, mat)
    # Shore rocks — darker, alien-stone colour (not earthy grey-brown)
    for i in range(5):
        angle = (i / 5) * 2 * math.pi + math.pi / 10
        rx = 0.76 * math.cos(angle)
        ry = 0.76 * math.sin(angle)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.052, location=(rx, ry, z0 + 0.032))
        rock = bpy.context.active_object
        rock.scale = (
            1.0 + random.uniform(-0.3, 0.3),
            1.0 + random.uniform(-0.3, 0.3),
            0.48
        )
        bpy.ops.object.transform_apply(scale=True)
        shade = 0.13 + random.uniform(-0.02, 0.02)
        mat = make_material(f"rock_{i}", (shade, shade * 0.85, shade * 1.30), roughness=0.92)
        assign_mat(rock, mat)


def build_mana_crystal():
    make_hex_base(color=(0.14, 0.06, 0.32), roughness=0.68)
    z0 = HEX_DEPTH / 2
    # Deep purple glowing ground
    add_disc(0.88, 0.002, (0.18, 0.08, 0.38), roughness=0.60, name="void_ground")
    # Inner rune disc with emission
    add_disc(0.46, 0.004, (0.38, 0.08, 0.88), roughness=0.45,
             emission=(0.55, 0.08, 1.00), emission_strength=4.0, name="rune_disc")
    # Crystal cluster
    crystals = [
        # (x, y, body_height, tip_height, radius, rot_z, color)
        ( 0.00,  0.00, 0.44, 0.28, 0.100, 0,   (0.80, 0.28, 1.00)),
        (-0.16,  0.10, 0.30, 0.20, 0.075, 22,  (0.70, 0.18, 0.95)),
        ( 0.19, -0.08, 0.34, 0.22, 0.075, -18, (0.85, 0.32, 1.00)),
        (-0.09, -0.20, 0.24, 0.16, 0.062, 38,  (0.62, 0.14, 0.88)),
        ( 0.22,  0.20, 0.20, 0.14, 0.055, -32, (0.90, 0.38, 1.00)),
        (-0.24, -0.05, 0.22, 0.14, 0.055, 12,  (0.75, 0.22, 0.94)),
    ]
    for i, (x, y, bh, th, r, rz, col) in enumerate(crystals):
        emcol = tuple(min(c * 1.4, 1.0) for c in col)
        # Hexagonal prism body
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=6, radius=r, depth=bh,
            location=(x, y, z0 + bh / 2)
        )
        body = bpy.context.active_object
        body.rotation_euler[2] = math.radians(rz)
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material(f"crys_body_{i}", col, roughness=0.06, specular=0.96,
                            emission=emcol, emission_strength=4.0)
        assign_mat(body, mat)
        # Pointed tip
        bpy.ops.mesh.primitive_cone_add(
            vertices=6, radius1=r, radius2=0.0,
            depth=th, location=(x, y, z0 + bh + th / 2)
        )
        tip = bpy.context.active_object
        tip.rotation_euler[2] = math.radians(rz)
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material(f"crys_tip_{i}", col, roughness=0.03, specular=0.99,
                            emission=emcol, emission_strength=6.0)
        assign_mat(tip, mat)


def _build_base(team_color, team_name):
    """Shared builder for faction bases."""
    bc = team_color
    dark = tuple(c * 0.55 for c in bc)
    make_hex_base(color=dark, roughness=0.72)
    z0 = HEX_DEPTH / 2
    # Raised platform
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.72, depth=0.11,
        location=(0, 0, z0 + 0.055)
    )
    plat = bpy.context.active_object
    plat.rotation_euler[2] = math.radians(30)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material(f"{team_name}_plat", dark, roughness=0.62, metallic=0.22)
    assign_mat(plat, mat)
    # Glowing emblem disc
    bpy.ops.mesh.primitive_circle_add(
        vertices=24, radius=0.30, fill_type='TRIFAN',
        location=(0, 0, z0 + 0.12)
    )
    emb = bpy.context.active_object
    bright = tuple(min(c * 1.5, 1.0) for c in bc)
    mat = make_material(f"{team_name}_emblem", bc, roughness=0.28,
                        emission=bright, emission_strength=3.0)
    assign_mat(emb, mat)
    # Three corner pillars at 120° apart
    for a_deg in [30, 150, 270]:
        a = math.radians(a_deg)
        px, py = 0.50 * math.cos(a), 0.50 * math.sin(a)
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=6, radius=0.058, depth=0.30,
            location=(px, py, z0 + 0.15)
        )
        pillar = bpy.context.active_object
        mat = make_material(f"{team_name}_pillar_{a_deg}", dark,
                            roughness=0.55, metallic=0.30)
        assign_mat(pillar, mat)


def build_base_blue():
    _build_base((0.08, 0.22, 0.82), "blue")


def build_base_red():
    _build_base((0.78, 0.07, 0.07), "red")


def _build_spawn(team_color, team_name):
    make_hex_base(color=(0.18, 0.20, 0.24), roughness=0.86)
    z0 = HEX_DEPTH / 2
    bright = tuple(min(c * 1.3, 1.0) for c in team_color)
    # Tinted ground platform
    tint = tuple(max(c * 0.35, 0.05) for c in team_color)
    add_disc(0.80, 0.002, tint, roughness=0.86, name=f"{team_name}_ground")
    # Glowing outer ring (now visible as oval from isometric)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.64, minor_radius=0.038,
        major_segments=32, minor_segments=8,
        location=(0, 0, z0 + 0.038)
    )
    ring = bpy.context.active_object
    mat = make_material(f"{team_name}_ring", team_color, roughness=0.18,
                        emission=bright, emission_strength=4.0)
    assign_mat(ring, mat)
    # Central beacon column — the primary isometric-readable element
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.060, depth=0.50,
        location=(0, 0, z0 + 0.25)
    )
    beacon = bpy.context.active_object
    mat = make_material(f"{team_name}_beacon", team_color, roughness=0.18,
                        metallic=0.25, emission=bright, emission_strength=3.0)
    assign_mat(beacon, mat)
    # Beacon tip — bright glowing orb
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, z0 + 0.56))
    orb = bpy.context.active_object
    mat = make_material(f"{team_name}_orb", bright, roughness=0.06,
                        emission=bright, emission_strength=6.0)
    assign_mat(orb, mat)
    # Two flanking mini-pillars for faction identity
    for side, sx in enumerate([-0.38, 0.38]):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=6, radius=0.030, depth=0.28,
            location=(sx, 0, z0 + 0.14)
        )
        pillar = bpy.context.active_object
        mat = make_material(f"{team_name}_mini_{side}", team_color, roughness=0.25,
                            metallic=0.20, emission=bright, emission_strength=2.0)
        assign_mat(pillar, mat)


def build_spawn_blue():
    _build_spawn((0.15, 0.45, 1.00), "blue")


def build_spawn_red():
    _build_spawn((1.00, 0.20, 0.14), "red")


def build_desert():
    """Alien cosmic desert — scorched wasteland with obelisks dominating the horizon."""
    make_hex_base(color=(0.28, 0.12, 0.04), roughness=0.96)
    z0 = HEX_DEPTH / 2
    # Scorched alien sand
    add_disc(0.88, 0.002, (0.35, 0.16, 0.05), roughness=0.97, name="alien_sand")
    # Energy storm ground scar — SMALLER (was 0.40, now 0.22) so obelisks dominate
    add_disc(0.22, 0.004, (0.70, 0.28, 0.05), roughness=0.40,
             emission=(0.90, 0.35, 0.02), emission_strength=3.0, name="storm_core")
    # Sand dunes (background fill)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.50, location=(0.10, -0.08, z0 - 0.30))
    d1 = bpy.context.active_object
    d1.scale = (1.25, 0.85, 0.58)
    bpy.ops.object.transform_apply(scale=True)
    mat = make_material("dune1", (0.40, 0.18, 0.04), roughness=0.97)
    assign_mat(d1, mat)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.30, location=(-0.34, 0.22, z0 - 0.18))
    d2 = bpy.context.active_object
    d2.scale = (1.05, 0.78, 0.50)
    bpy.ops.object.transform_apply(scale=True)
    mat = make_material("dune2", (0.42, 0.20, 0.05), roughness=0.97)
    assign_mat(d2, mat)
    # MAIN alien obelisk — taller, more central, hero element
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.054, depth=0.72,
        location=(-0.12, -0.10, z0 + 0.36)
    )
    obelisk = bpy.context.active_object
    obelisk.rotation_euler[2] = math.radians(15)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material("obelisk", (0.14, 0.08, 0.04), roughness=0.28, metallic=0.82)
    assign_mat(obelisk, mat)
    # Main obelisk tip — glowing energy capstone
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.054, radius2=0.0, depth=0.14,
        location=(-0.12, -0.10, z0 + 0.79)
    )
    tip = bpy.context.active_object
    mat = make_material("obelisk_tip", (1.00, 0.52, 0.05), roughness=0.08,
                        emission=(1.00, 0.42, 0.02), emission_strength=6.5)
    assign_mat(tip, mat)
    # Secondary smaller obelisk — offset, adds depth
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.036, depth=0.44,
        location=(0.34, 0.28, z0 + 0.22)
    )
    ob2 = bpy.context.active_object
    ob2.rotation_euler[2] = math.radians(42)
    bpy.ops.object.transform_apply(rotation=True)
    mat = make_material("obelisk2", (0.16, 0.09, 0.04), roughness=0.30, metallic=0.78)
    assign_mat(ob2, mat)
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.036, radius2=0.0, depth=0.09,
        location=(0.34, 0.28, z0 + 0.485)
    )
    tip2 = bpy.context.active_object
    mat = make_material("obelisk2_tip", (1.00, 0.52, 0.05), roughness=0.10,
                        emission=(1.00, 0.40, 0.02), emission_strength=5.5)
    assign_mat(tip2, mat)
    # Plasma storm particles (small glowing orbs floating at edges)
    storm_pts = [(0.50, 0.10), (-0.50, -0.20), (0.20, 0.55), (-0.15, -0.58)]
    for i, (px, py) in enumerate(storm_pts):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.030, location=(px, py, z0 + 0.048))
        spark = bpy.context.active_object
        mat = make_material(f"spark_{i}", (1.00, 0.55, 0.08), roughness=0.10,
                            emission=(1.00, 0.45, 0.05), emission_strength=7.0)
        assign_mat(spark, mat)


def build_snow():
    """Cosmic frozen world — alien ice with aurora energy, crystalline spires, void cold."""
    make_hex_base(color=(0.18, 0.22, 0.42), roughness=0.75)
    z0 = HEX_DEPTH / 2
    # Frozen void surface with blue-white glow
    add_disc(0.90, 0.003, (0.55, 0.72, 0.92), roughness=0.18,
             specular=0.92, name="frozen_surface")
    # Aurora ground disc — emissive teal-cyan glow
    add_disc(0.42, 0.005, (0.10, 0.60, 0.90), roughness=0.20,
             emission=(0.08, 0.50, 0.95), emission_strength=2.5, name="aurora_glow")
    # Central ice formation — compressed hemisphere
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.38, location=(0, 0, z0 - 0.20))
    mound = bpy.context.active_object
    mound.scale = (1.0, 1.0, 0.48)
    bpy.ops.object.transform_apply(scale=True)
    mat = make_material("ice_mound", (0.72, 0.88, 1.00), roughness=0.06,
                        specular=0.98, transmission=0.55, ior=1.31)
    assign_mat(mound, mat)
    # Alien ice crystal spires (narrow, glowing cold blue)
    crystal_pts = [
        (-0.40, 0.26, 0.36, 0.038, (0.50, 0.82, 1.00)),
        ( 0.38, -0.22, 0.30, 0.032, (0.60, 0.88, 1.00)),
        ( 0.04, -0.50, 0.24, 0.028, (0.55, 0.85, 1.00)),
        (-0.20, -0.44, 0.20, 0.025, (0.48, 0.80, 1.00)),
    ]
    for i, (cx, cy, ch, cr, col) in enumerate(crystal_pts):
        em = tuple(min(c * 1.2, 1.0) for c in col)
        bpy.ops.mesh.primitive_cone_add(
            vertices=6, radius1=cr, radius2=0.0,
            depth=ch, location=(cx, cy, z0 + ch / 2)
        )
        shard = bpy.context.active_object
        shard.rotation_euler[2] = random.uniform(0, math.pi)
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material(f"shard_{i}", col, roughness=0.04, specular=0.98,
                            emission=em, emission_strength=3.5,
                            transmission=0.45, ior=1.31)
        assign_mat(shard, mat)
    # Aurora wisps (thin emissive orbs floating at edges)
    wisp_pts = [(0.58, 0.10), (-0.55, -0.15), (0.12, 0.62), (-0.30, 0.55)]
    for i, (wx, wy) in enumerate(wisp_pts):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.030, location=(wx, wy, z0 + 0.045))
        wisp = bpy.context.active_object
        col = [(0.30, 0.80, 1.00), (0.20, 0.95, 0.90),
               (0.40, 0.75, 1.00), (0.25, 0.88, 0.95)][i]
        mat = make_material(f"wisp_{i}", col, roughness=0.10,
                            emission=col, emission_strength=7.0)
        assign_mat(wisp, mat)


def build_ice():
    """Frozen void slab — dark alien permafrost with glowing energy veins locked within."""
    make_hex_base(color=(0.08, 0.10, 0.18), roughness=0.15, metallic=0.05)
    z0 = HEX_DEPTH / 2
    # Dark alien ice surface — reflective, slightly blue-tinted void ice
    add_disc(0.90, 0.003, (0.16, 0.24, 0.50), roughness=0.04, specular=0.98,
             transmission=0.38, ior=1.31, alpha=0.90, name="ice_surf")
    # Frozen energy core — vivid glow visible through translucent ice
    add_disc(0.28, 0.005, (0.08, 0.35, 0.88), roughness=0.08, specular=0.96,
             emission=(0.06, 0.42, 1.00), emission_strength=3.5,
             alpha=0.85, name="frozen_core")
    # Glowing energy crack lines (lit from within — not just dark gaps)
    cracks = [
        (( 0.04,  0.02), 0.0,              0.70),
        (( 0.10,  0.08), math.radians( 42), 0.52),
        ((-0.08, -0.10), math.radians(-28), 0.44),
        ((-0.02, -0.04), math.radians( 78), 0.36),
    ]
    for i, ((cx, cy), rz, sx) in enumerate(cracks):
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=(cx, cy, z0 + 0.007))
        crack = bpy.context.active_object
        crack.scale = (sx, 0.018, 1.0)
        crack.rotation_euler[2] = rz
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        mat = make_material(f"crack_{i}", (0.15, 0.55, 1.00), roughness=0.08,
                            emission=(0.08, 0.45, 1.00), emission_strength=3.0, alpha=0.90)
        assign_mat(crack, mat)
    # Alien ice shards — 4-sided prisms, blue-white, semi-transparent
    shard_pts = [
        (-0.44,  0.28, 0.30, 0.042, (0.42, 0.72, 1.00)),
        ( 0.42, -0.24, 0.24, 0.036, (0.55, 0.82, 1.00)),
        ( 0.06, -0.52, 0.20, 0.030, (0.38, 0.68, 1.00)),
        (-0.54, -0.14, 0.18, 0.026, (0.48, 0.76, 1.00)),
    ]
    for i, (sx, sy, sh, sr, col) in enumerate(shard_pts):
        em = tuple(min(c * 1.15, 1.0) for c in col)
        bpy.ops.mesh.primitive_cone_add(
            vertices=4, radius1=sr, radius2=0.0,
            depth=sh, location=(sx, sy, z0 + sh / 2)
        )
        shard = bpy.context.active_object
        shard.rotation_euler[2] = random.uniform(0, math.pi)
        bpy.ops.object.transform_apply(rotation=True)
        mat = make_material(f"ice_shard_{i}", col, roughness=0.04, specular=0.98,
                            emission=em, emission_strength=3.5,
                            transmission=0.48, ior=1.31)
        assign_mat(shard, mat)


def build_mud():
    make_hex_base(color=(0.20, 0.12, 0.05), roughness=0.98)
    z0 = HEX_DEPTH / 2
    # Muddy surface
    add_disc(0.90, 0.002, (0.22, 0.14, 0.06), roughness=0.98, name="mud_surf")
    # Lumps / ruts
    lumps = [
        ( 0.26,  0.22, 0.092), (-0.32, -0.16, 0.080),
        ( 0.02, -0.40, 0.072), (-0.24,  0.40, 0.065),
        ( 0.46, -0.06, 0.075),
    ]
    for i, (x, y, r) in enumerate(lumps):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z0 + r * 0.48))
        lump = bpy.context.active_object
        lump.scale = (1.20, 0.90, 0.52)
        bpy.ops.object.transform_apply(scale=True)
        s = 0.20 + random.uniform(-0.02, 0.04)
        mat = make_material(f"lump_{i}", (s + 0.04, s * 0.68, s * 0.28), roughness=0.98)
        assign_mat(lump, mat)
    # Small muddy puddle
    add_disc(0.22, 0.007, (0.10, 0.07, 0.03), roughness=0.10, specular=0.60,
             alpha=0.80, name="puddle")


# ── LIGHTING ──────────────────────────────────────────────────────────────────

def setup_lighting(rim_color=(0.5, 0.5, 0.5)):
    """4-point rig tuned for isometric side-angle view."""
    for obj in list(bpy.data.objects):
        if obj.type == 'LIGHT':
            bpy.data.objects.remove(obj, do_unlink=True)

    def add_light(name, ltype, location, energy, color=(1, 1, 1)):
        bpy.ops.object.light_add(type=ltype, location=location)
        light = bpy.context.active_object
        light.name = name
        light.data.energy = energy
        light.data.color  = color
        if ltype == 'AREA':
            light.data.size = 4.0
        elif ltype == 'SPOT':
            light.data.spot_size  = 0.95
            light.data.spot_blend = 0.30
        direction = Vector((0, 0, 0)) - Vector(location)
        rot = direction.to_track_quat('-Z', 'Y')
        light.rotation_euler = rot.to_euler()

    # Key — warm, upper-left, elevated (main surface illumination)
    add_light("key",   'AREA',  (-2.4, -1.8, 5.5), energy=480, color=(1.00, 0.94, 0.84))
    # Front-fill — illuminates the FRONT FACES visible at isometric angle
    add_light("front", 'AREA',  ( 0.0, -5.0, 1.5), energy=220, color=(0.80, 0.90, 1.00))
    # Fill — cool, right side, secondary surface light
    add_light("fill",  'AREA',  ( 3.0,  1.2, 3.5), energy=120, color=(0.76, 0.86, 1.00))
    # Rim — terrain accent colour, from behind/above for edge highlights
    add_light("rim",   'SPOT',  ( 0.2,  3.5, 3.0), energy=380, color=rim_color)
    # Top ambient — soft diffuse fill
    add_light("top",   'AREA',  ( 0.0,  0.0, 7.0), energy=60,  color=(0.88, 0.88, 1.00))


# ── CAMERA ────────────────────────────────────────────────────────────────────

def setup_camera():
    """Overhead camera with slight perspective tilt — board-game diorama angle."""
    loc = (0.0, -CAM_Y_BACK, CAM_HEIGHT)
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object
    cam.name = "terrain_cam"
    direction = Vector((0, 0, 0)) - Vector(loc)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens       = CAM_LENS
    cam.data.clip_start = 0.1
    cam.data.clip_end   = 50.0
    bpy.context.scene.camera = cam
    return cam


# ── RENDER SETTINGS ───────────────────────────────────────────────────────────

def setup_render(output_path):
    scene = bpy.context.scene

    # Engine — prefer EEVEE_NEXT (Blender 4.x), fall back to EEVEE (3.x)
    for engine in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try:
            scene.render.engine = engine
            break
        except Exception:
            continue

    scene.render.resolution_x          = TILE_RES
    scene.render.resolution_y          = TILE_RES
    scene.render.resolution_percentage = 100
    scene.render.film_transparent       = True
    scene.render.image_settings.file_format  = 'PNG'
    scene.render.image_settings.color_mode  = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.filepath               = output_path

    # EEVEE tweaks
    eevee = getattr(scene, 'eevee', None)
    if eevee:
        for attr, val in [
            ('taa_render_samples', SAMPLES),
            ('use_bloom',          True),
            ('bloom_threshold',    0.40),   # lower = more surfaces glow
            ('bloom_intensity',    0.35),   # strong bloom for cosmic feel
            ('bloom_radius',       6.5),
            ('bloom_clamp',        0.0),    # unclamped = max glow
            ('use_ssr',            True),
            ('use_ssr_refraction', True),
        ]:
            if hasattr(eevee, attr):
                setattr(eevee, attr, val)

    # Color management — prevent Filmic from blowing vivid emissions to white
    scene.view_settings.view_transform = 'Filmic'
    scene.view_settings.look            = 'High Contrast'
    scene.view_settings.exposure        = -0.5   # pull back highlights so colours hold
    scene.view_settings.gamma           = 1.0

    # Transparent black world (gives clean alpha on non-geometry pixels)
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value    = (0, 0, 0, 1)
        bg.inputs["Strength"].default_value = 0.0


# ── BUILDER DISPATCH ──────────────────────────────────────────────────────────

BUILDER_MAP = {
    "forest":       build_forest,
    "mountain":     build_mountain,
    "river":        build_river,
    "plain":        build_plain,
    "mana_crystal": build_mana_crystal,
    "base_blue":    build_base_blue,
    "base_red":     build_base_red,
    "spawn_blue":   build_spawn_blue,
    "spawn_red":    build_spawn_red,
    "lake":         build_lake,
    "desert":       build_desert,
    "snow":         build_snow,
    "ice":          build_ice,
    "mud":          build_mud,
}

# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    random.seed(42)     # deterministic geometry every run
    os.makedirs(OUT_DIR, exist_ok=True)

    # One-time scene wipe
    clear_scene()

    # Camera persists across all tiles
    setup_camera()

    # RENDER_ONLY can be None (all), a string ("plain"), or a list (["plain", "lake"])
    if RENDER_ONLY is None:
        to_render = list(TERRAINS)
    elif isinstance(RENDER_ONLY, (list, tuple)):
        to_render = [t for t in TERRAINS if t[0] in RENDER_ONLY]
    else:
        to_render = [t for t in TERRAINS if t[0] == RENDER_ONLY]
    if not to_render:
        print(f"[WCW Terrain] WARNING: RENDER_ONLY='{RENDER_ONLY}' matched nothing. Rendering all.")
        to_render = list(TERRAINS)

    total = len(to_render)
    for idx, (terrain_id, filename, rim_color, _, cam_y_override) in enumerate(to_render):
        print(f"\n[WCW Terrain] {idx + 1}/{total} — {terrain_id}")

        clear_terrain_objects()

        # Per-tile camera angle — taller geometry needs more tilt to read properly
        effective_cam_y = cam_y_override if cam_y_override is not None else CAM_Y_BACK
        cam = bpy.data.objects.get("terrain_cam")
        if cam:
            new_loc = (0.0, -effective_cam_y, CAM_HEIGHT)
            cam.location = Vector(new_loc)
            direction = Vector((0, 0, 0)) - Vector(new_loc)
            cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

        setup_lighting(rim_color=rim_color)

        builder = BUILDER_MAP.get(terrain_id)
        if builder is None:
            print(f"[WCW Terrain] No builder for '{terrain_id}', skipping.")
            continue

        builder()

        out_path = os.path.join(OUT_DIR, filename)
        setup_render(out_path)
        bpy.ops.render.render(write_still=True)
        print(f"[WCW Terrain] Saved → {out_path}")

    print(f"\n[WCW Terrain] ── Done. {total} tile(s) rendered to {OUT_DIR} ──")


main()
