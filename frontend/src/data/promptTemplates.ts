export interface PromptTemplate {
  label: string;
  prompts: string[];
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    label: 'Fantasy Warrior',
    prompts: [
      "Epic fantasy warrior standing on a battlefield, holding a massive sword, ornate steel armor with engraved details, flowing cape, wind-swept hair, ancient ruins in background, glowing embers in the air, cinematic composition, dramatic lighting, golden hour, high resolution, detailed skin texture, sharp focus, intense gaze, low angle shot, dark gritty atmosphere, realistic style, bad hands, bad eyes"
    ],
  },
  {
    label: 'Dark Sorcerer',
    prompts: [
      "Dark sorcerer casting forbidden magic, hooded figure in tattered robes, glowing purple eyes, arcane energy swirling around hands, ancient spell circle beneath feet, ruined gothic temple environment, floating debris, dark mist, cinematic composition, dramatic lighting, cold blue and violet tones, high resolution, detailed skin texture, sharp focus, ominous atmosphere, low angle shot, realistic style, bad hands, bad eyes"
    ],
  },
  {
    label: 'Nature Spirit',
    prompts: [
      "Ethereal nature spirit emerging from a lush forest, feminine figure made of vines and leaves, glowing green eyes, bark-textured skin, flowing hair of moss and petals, surrounded by floating fireflies, ancient trees and soft mist, gentle wildlife nearby, cinematic composition, soft diffused lighting, golden green tones, high resolution, detailed skin texture, serene expression, magical atmosphere, medium shot, realistic style, bad hands, bad eyes"
    ],
  },
  {
    label: 'Dragon Rider',
    prompts: [
      "Dragon rider soaring through the sky on a विशाल dragon, armored warrior gripping reins, detailed scale texture, massive wings spread wide, clouds swirling beneath, dramatic mountain peaks below, flowing cape, wind-swept hair, cinematic composition, golden hour lighting, warm orange and red tones, high resolution, detailed skin texture, dynamic motion, epic scale, wide shot, realistic style, bad hands, bad eyes"
    ],
  },
  {
    label: 'Mythical Beast',
    prompts: [
      "Mythical beast standing in an ancient forest clearing, massive hybrid creature with horns, fangs, and glowing eyes, intricate fur and scale textures, muscular body, mist curling around its form, broken stone ruins nearby, bioluminescent plants, cinematic composition, dramatic lighting, cool green and blue tones, high resolution, ultra detailed texture, sharp focus, powerful stance, low angle shot, mystical atmosphere, realistic style, bad hands, bad eyes"
    ],
  },
  {
    label: 'Undead Lord',
    prompts: [
     "Undead lord seated on a shattered throne, skeletal face with faint decayed flesh, glowing blue eyes, ornate blackened armor, crown of jagged bone, tattered cape, dark aura emanating, surrounded by skulls and ruined pillars, gothic fortress interior, drifting ash and cold mist, cinematic composition, dramatic lighting, cold blue and desaturated tones, high resolution, ultra detailed texture, sharp focus, menacing presence, low angle shot, realistic style, bad hands, bad eyes"
    ],
  },
  {
    label: 'Celestial Knight',
    prompts: [
      "Celestial knight descending from the heavens, radiant armor glowing with divine light, angelic wings spread wide, ornate golden plate with engraved runes, halo of light above head, holding a luminous sword, floating in a sky filled with clouds and sun rays, particles of light drifting, cinematic composition, soft radiant lighting, warm gold and white tones, high resolution, ultra detailed texture, sharp focus, heroic expression, epic atmosphere, low angle shot, realistic style, bad hands, bad eyes"
    ],
  },
  {
    label: 'Forest Witch',
    prompts: [
      "Forest witch standing in an enchanted woodland, cloaked figure with antler crown, long flowing hair tangled with leaves and twigs, glowing green eyes, holding a twisted staff, dark vines wrapping around arms, mushrooms and herbs at her feet, ancient trees and thick mist surrounding, floating spores in the air, cinematic composition, soft diffused lighting, earthy green and brown tones, high resolution, detailed skin texture, sharp focus, mysterious expression, medium shot, mystical atmosphere, realistic style, bad hands, bad eyes"
    ],
  },
];

export const MOTION_SUGGESTIONS: string[] = [
  'Slow cinematic camera orbit around the character',
  'Wind blowing through hair and cape, subtle breathing',
  'Dramatic zoom in with particle effects',
  'Flickering firelight casting moving shadows',
  'Character turns head slowly toward the camera',
  'Gentle floating motion with magical particles rising',
  'Camera pulls back to reveal the full scene',
];

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
