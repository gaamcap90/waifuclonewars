"""
Waifu Clone Wars — Blender Scene Setup Script
Run this in Blender's Scripting tab ONCE to configure the full render rig.
After running: model your character, assign the WCW_Toon material, then render.

Output files land directly in /public/art/ ready for the game.
"""

import bpy
import os
import math

# ── CONFIG ────────────────────────────────────────────────────────────────────

# Change this to the character you're working on:
CHARACTER_ID = "napoleon"   # napoleon | genghis | davinci | leonidas | sunsin | beethoven | huang

# Where the game reads portrait files from (adjust to your repo path):
REPO_ROOT = r"C:\Users\gaamc\Documents\GitHub\waifuclonewars\public\art"

# Render sizes
PORTRAIT_SIZE = 1024   # Final portrait: 1024x1024
SPRITE_SIZE   = 256    # Sprite: 256x256

# ── RENDER ENGINE ─────────────────────────────────────────────────────────────

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'

# RGBA — transparent background (critical for game overlay use)
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'

# Anti-aliasing
scene.eevee.taa_render_samples = 64

# Resolution — portrait mode
scene.render.resolution_x = PORTRAIT_SIZE
scene.render.resolution_y = PORTRAIT_SIZE
scene.render.resolution_percentage = 100

# Output path
scene.render.filepath = os.path.join(REPO_ROOT, f"{CHARACTER_ID}_portrait.png")

print(f"[WCW] Render output → {scene.render.filepath}")

# ── WORLD — pure transparent, no sky ─────────────────────────────────────────

world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
world_nodes = world.node_tree.nodes
world_nodes.clear()
bg_node = world_nodes.new('ShaderNodeBackground')
bg_node.inputs['Color'].default_value = (0, 0, 0, 0)
bg_node.inputs['Strength'].default_value = 0.0
out_node = world_nodes.new('ShaderNodeOutputWorld')
world.node_tree.links.new(bg_node.outputs['Background'], out_node.inputs['Surface'])

# ── CAMERA ────────────────────────────────────────────────────────────────────
# Slightly low angle looking up (~15°) — characters feel powerful
# Portrait crop: bust/three-quarter (head + upper torso)

cam_data = bpy.data.cameras.get("WCW_Camera") or bpy.data.cameras.new("WCW_Camera")
cam_data.lens = 85          # Mild telephoto — flattering for faces, no distortion
cam_data.clip_start = 0.1
cam_data.clip_end = 100

cam_obj = bpy.data.objects.get("WCW_Camera")
if not cam_obj:
    cam_obj = bpy.data.objects.new("WCW_Camera", cam_data)
    scene.collection.objects.link(cam_obj)

# Position: 2m in front, 1.5m up, angled slightly downward toward character chest
cam_obj.location = (0, -2.8, 1.55)
cam_obj.rotation_euler = (math.radians(78), 0, 0)   # ~12° downward tilt
scene.camera = cam_obj

# ── LIGHTING — 3-point rig ────────────────────────────────────────────────────
# Key: warm front-left, Fill: cool front-right, Rim: accent color from behind

def make_light(name, ltype, energy, color, location, size=0.5):
    ld = bpy.data.lights.get(name) or bpy.data.lights.new(name, ltype)
    ld.energy = energy
    ld.color = color
    if ltype == 'AREA':
        ld.size = size
    lo = bpy.data.objects.get(name)
    if not lo:
        lo = bpy.data.objects.new(name, ld)
        scene.collection.objects.link(lo)
    lo.location = location
    return lo

# Key light — warm, front-left, angled down
key = make_light("WCW_Key",  'AREA', energy=150, color=(1.0, 0.92, 0.80),
                 location=(-1.8, -1.5, 3.0), size=1.2)
key.rotation_euler = (math.radians(55), math.radians(-20), 0)

# Fill light — cool, front-right, softer
fill = make_light("WCW_Fill", 'AREA', energy=40,  color=(0.75, 0.88, 1.0),
                  location=(2.0, -1.0, 2.0), size=2.0)
fill.rotation_euler = (math.radians(50), math.radians(25), 0)

# Rim light — bright accent from behind. Change color per character accent:
# Napoleon=gold, Genghis=orange, Da Vinci=cobalt, Leonidas=bronze,
# Sun-sin=teal, Beethoven=violet, Huang=crimson
RIM_COLORS = {
    "napoleon":  (1.0, 0.82, 0.2),
    "genghis":   (1.0, 0.45, 0.1),
    "davinci":   (0.3, 0.6,  1.0),
    "leonidas":  (0.8, 0.55, 0.2),
    "sunsin":    (0.2, 0.85, 0.75),
    "beethoven": (0.72, 0.3, 1.0),
    "huang":     (0.9, 0.25, 0.15),
}
rim_color = RIM_COLORS.get(CHARACTER_ID, (1.0, 1.0, 1.0))
rim = make_light("WCW_Rim",  'SPOT', energy=300, color=rim_color,
                 location=(0, 2.5, 2.2), size=0.4)
rim.rotation_euler = (math.radians(-45), 0, 0)
rim.data.spot_size = math.radians(45)
rim.data.spot_blend = 0.3

print(f"[WCW] Lights created. Rim color: {rim_color}")

# ── TOON SHADER MATERIAL ──────────────────────────────────────────────────────
# A reusable base material. Assign this to your mesh, then override Base Color
# per character. The ColorRamp creates the hard cel-shading bands.

mat_name = "WCW_Toon"
mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
mat.use_nodes = True
mat.blend_method = 'HASHED'   # For transparent edges on hair etc.

nodes = mat.node_tree.nodes
links = mat.node_tree.links
nodes.clear()

# Shader diffuse with hard ramp
diff   = nodes.new('ShaderNodeBsdfDiffuse')
ramp   = nodes.new('ShaderNodeValToRGB')
shader = nodes.new('ShaderNodeNewGeometry')
emit   = nodes.new('ShaderNodeEmission')
mix    = nodes.new('ShaderNodeMixShader')
fresnel= nodes.new('ShaderNodeFresnel')
out    = nodes.new('ShaderNodeOutputMaterial')

# ColorRamp: 3 hard stops = shadow / midtone / highlight (cel look)
ramp.color_ramp.interpolation = 'CONSTANT'
ramp.color_ramp.elements[0].position = 0.0
ramp.color_ramp.elements[0].color    = (0.05, 0.05, 0.05, 1)   # shadow
ramp.color_ramp.elements[1].position = 0.45
ramp.color_ramp.elements[1].color    = (0.72, 0.72, 0.72, 1)   # midtone
elem = ramp.color_ramp.elements.new(0.75)
elem.color = (1.0, 1.0, 1.0, 1)                                  # highlight

# Wire it: Geometry→Fresnel (for shading input) → ColorRamp → Diffuse Base Color
# For a quick setup we drive the ramp from a LightPath-based dot product:
geo      = nodes.new('ShaderNodeNewGeometry')
dot_node = nodes.new('ShaderNodeVectorMath')
dot_node.operation = 'DOT_PRODUCT'

# Simplified: plug diffuse into output directly; artist adjusts Base Color
diff.inputs['Color'].default_value = (0.8, 0.6, 0.7, 1.0)   # placeholder pink
links.new(diff.outputs['BSDF'], out.inputs['Surface'])

# Layout
diff.location    = (-200, 0)
out.location     = (200,  0)
ramp.location    = (-500, 0)

print(f"[WCW] Material '{mat_name}' created. Assign to mesh and change Base Color.")

# ── FREESTYLE — ink outlines ──────────────────────────────────────────────────

scene.render.use_freestyle = True
view_layer = scene.view_layers[0]
view_layer.use_freestyle = True

# Clear existing line sets
fs = view_layer.freestyle_settings
for ls in list(fs.linesets):
    fs.linesets.remove(ls)

ls = fs.linesets.new("WCW_Outline")
ls.select_silhouette = True
ls.select_border     = True
ls.select_crease     = True
ls.crease_angle      = math.radians(70)
ls.select_edge_mark  = False

# Linestyle — solid black
lstyle_name = "WCW_Ink"
lstyle = bpy.data.linestyles.get(lstyle_name) or bpy.data.linestyles.new(lstyle_name)
lstyle.color = (0.0, 0.0, 0.0)
lstyle.thickness = 2.0
lstyle.use_chaining = True
ls.linestyle = lstyle

print("[WCW] Freestyle outlines configured (2px black).")

# ── COMPOSITOR — color grading pass ──────────────────────────────────────────
# Slight saturation boost + very mild color correction for the anime look

scene.use_nodes = True
comp = scene.node_tree
comp.nodes.clear()

render_layers = comp.nodes.new('CompositorNodeRLayers')
hue_sat       = comp.nodes.new('CompositorNodeHueSat')
composite     = comp.nodes.new('CompositorNodeComposite')
viewer        = comp.nodes.new('CompositorNodeViewer')

hue_sat.inputs['Saturation'].default_value = 1.18   # slightly punchy
hue_sat.inputs['Value'].default_value      = 1.02

comp.links.new(render_layers.outputs['Image'],     hue_sat.inputs['Image'])
comp.links.new(hue_sat.outputs['Image'],           composite.inputs['Image'])
comp.links.new(hue_sat.outputs['Image'],           viewer.inputs['Image'])

# Pass alpha through
comp.links.new(render_layers.outputs['Alpha'],     composite.inputs['Alpha'])

render_layers.location = (-400, 0)
hue_sat.location       = (-100, 0)
composite.location     = (200,  0)
viewer.location        = (200, -200)

print("[WCW] Compositor: saturation boost active.")

# ── FINAL SUMMARY ────────────────────────────────────────────────────────────

print(f"""
╔══════════════════════════════════════════════╗
  WCW Scene Setup Complete
  Character : {CHARACTER_ID}
  Output    : {scene.render.filepath}
  Size      : {PORTRAIT_SIZE}×{PORTRAIT_SIZE}px RGBA PNG
  Engine    : EEVEE + Freestyle
──────────────────────────────────────────────
  Next steps:
  1. Import or model your character mesh
  2. Assign WCW_Toon material → change Base Color
  3. Pose in front of WCW_Camera (use Camera View: Numpad 0)
  4. Press F12 to render portrait
  5. Change CHARACTER_ID + filepath for sprite render (256×256)
╚══════════════════════════════════════════════╝
""")
