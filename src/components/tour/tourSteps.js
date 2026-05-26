// Pure step data — no React imports. All tours defined here.
//
// Step shape:
// {
//   key: string            unique within tour
//   target: string | null  CSS selector; null = centered modal (no spotlight)
//   title: string
//   description: string    real \n for paragraph breaks
//   placement: 'auto'|'top'|'bottom'|'left'|'right'|'center'
//   padding?: number       breathing room around target (default 8)
//   prerequisite?: { kind: string, message: string, autoFix?: string }
// }

const core = {
  id: 'core',
  label: 'Getting Started',
  description: 'Learn the basics in about 2 minutes.',
  steps: [
    {
      key: 'welcome',
      target: null,
      title: 'Welcome to Interior Studio',
      description: 'A quick tour of the key features.\n\nFollow along to start designing your first floor plan.',
      placement: 'center',
    },
    {
      key: 'sidebar',
      target: '[data-tour="sidebar"]',
      title: 'The Catalog',
      description: 'Browse furniture, openings (doors & windows), and custom models here.\n\nDrag any tile onto the canvas to place it.',
      placement: 'right',
      padding: 6,
    },
    {
      key: 'canvas',
      target: '[data-tour="canvas"]',
      title: 'Your Floor Plan',
      description: 'This is the 2D canvas. Click to start drawing a wall, then click again to finish it.\n\nScroll to zoom · Space + drag to pan.',
      placement: 'auto',
      padding: 0,
    },
    {
      key: 'draw-wall',
      target: '[data-tour="canvas"]',
      title: 'Drawing Walls',
      description: 'Walls snap to 15° angle increments by default.\n\nHold Shift for 90° only · Hold Alt for free angle.\n\nWalls chain automatically — click to keep extending.',
      placement: 'auto',
      padding: 0,
    },
    {
      key: 'properties',
      target: '[data-tour="properties-panel"]',
      title: 'Properties Panel',
      description: 'Select any wall, furniture item, room, or opening to edit its properties here.\n\nDimensions, materials, colors, and more.',
      placement: 'left',
      padding: 6,
    },
    {
      key: 'view-3d',
      target: '[data-tour="toolbar-3d"]',
      title: 'Switch to 3D',
      description: 'Press this button to see your floor plan as a fully rendered 3D room.\n\nLighting, textures, and furniture all appear in 3D.',
      placement: 'bottom',
    },
    {
      key: 'save',
      target: '[data-tour="toolbar-save"]',
      title: 'Save Your Work',
      description: 'Save exports your project as a .studio.json file you can reopen later.\n\nYour work is also kept in browser storage automatically.',
      placement: 'bottom',
    },
    {
      key: 'done',
      target: null,
      title: "You're Ready!",
      description: "That covers the basics. Want to go deeper?\n\nPick a topic below or close to start designing.",
      placement: 'center',
    },
  ],
}

const materials = {
  id: 'materials',
  label: 'Materials & Colors',
  description: 'Apply floor, ceiling, and wall finishes.',
  steps: [
    {
      key: 'mat-intro',
      target: null,
      title: 'Materials & Colors',
      description: 'Learn how to apply floor finishes, ceiling materials, and wall colors to your design.',
      placement: 'center',
    },
    {
      key: 'mat-room',
      target: '[data-tour="canvas"]',
      title: 'Select a Room',
      description: 'Click inside any enclosed room polygon on the canvas to select it.\n\nThe room highlight turns blue when selected.',
      placement: 'auto',
      padding: 0,
    },
    {
      key: 'mat-floor-picker',
      target: '[data-tour="material-floor"]',
      title: 'Floor Material',
      description: 'Choose from wood, tile, marble, carpet, concrete and more.\n\nHover any swatch to see the material name.',
      placement: 'left',
      prerequisite: { kind: 'roomSelected', message: 'Select a room on the canvas first to see the floor picker.' },
    },
    {
      key: 'mat-ceiling',
      target: '[data-tour="material-ceiling"]',
      title: 'Ceiling Material',
      description: 'The ceiling picker works the same way.\n\nCeilings are visible in the 3D view.',
      placement: 'left',
      prerequisite: { kind: 'roomSelected', message: 'Select a room on the canvas first to see the ceiling picker.' },
    },
    {
      key: 'mat-3d',
      target: '[data-tour="toolbar-3d"]',
      title: 'Preview in 3D',
      description: 'Switch to 3D to see your materials rendered with full PBR textures.',
      placement: 'bottom',
    },
  ],
}

const viewer3d = {
  id: 'viewer3d',
  label: '3D Viewer & Walkthrough',
  description: 'Orbit, navigate, and walk through your room.',
  steps: [
    {
      key: '3d-intro',
      target: '[data-tour="toolbar-3d"]',
      title: '3D Viewer',
      description: 'Click here to switch to the 3D view. Your floor plan becomes a fully rendered room.',
      placement: 'bottom',
    },
    {
      key: '3d-canvas',
      target: '[data-tour="viewer3d-canvas"]',
      title: 'Orbit & Navigate',
      description: 'Left-drag to orbit · Right-drag to pan · Scroll to zoom.\n\nClick any wall, furniture, or room to select it from 3D.',
      placement: 'auto',
      padding: 0,
      prerequisite: { kind: 'show3d', message: 'Switch to 3D first.', autoFix: 'toggle3d' },
    },
    {
      key: '3d-lighting',
      target: '[data-tour="lighting-toolbar"]',
      title: 'Lighting Controls',
      description: 'Toggle lights · Drag the time slider to change the sun angle and color · Adjust ambient strength.',
      placement: 'left',
      prerequisite: { kind: 'show3d', message: 'Switch to 3D first.', autoFix: 'toggle3d' },
    },
    {
      key: '3d-walk',
      target: '[data-tour="toolbar-walk"]',
      title: 'Walkthrough Mode',
      description: 'Press Walk to lock the cursor and move through your room in first-person.\n\nWASD to move · Shift to run · Space to jump · Esc to exit.',
      placement: 'bottom',
      prerequisite: { kind: 'show3d', message: 'Switch to 3D first.', autoFix: 'toggle3d' },
    },
  ],
}

const openings = {
  id: 'openings',
  label: 'Doors & Windows',
  description: 'Place and configure openings on walls.',
  steps: [
    {
      key: 'op-intro',
      target: '[data-tour="sidebar"]',
      title: 'Doors & Windows',
      description: 'Find doors, windows, and arch openings in the Openings section of the catalog.',
      placement: 'right',
    },
    {
      key: 'op-drop',
      target: '[data-tour="canvas"]',
      title: 'Place on a Wall',
      description: 'Drag any opening tile onto the canvas and hover over a wall.\n\nA blue snap preview appears when you\'re close enough to a wall.',
      placement: 'auto',
      padding: 0,
    },
    {
      key: 'op-props',
      target: '[data-tour="properties-panel"]',
      title: 'Opening Properties',
      description: 'Select a door or window to edit width, height, color, and material.\n\nDoors have swing direction and open-toward controls.',
      placement: 'left',
    },
    {
      key: 'op-drag',
      target: '[data-tour="canvas"]',
      title: 'Reposition Openings',
      description: 'Drag a placed door or window along its wall to reposition it.\n\nIt stays clamped within the wall and away from other openings.',
      placement: 'auto',
      padding: 0,
    },
  ],
}

const ai = {
  id: 'ai',
  label: 'AI Assistant',
  description: 'Get design suggestions from Claude.',
  steps: [
    {
      key: 'ai-button',
      target: '[data-tour="toolbar-ai"]',
      title: 'AI Assistant',
      description: 'Click AI to open the assistant panel. It can suggest layouts, materials, and furniture arrangements.',
      placement: 'bottom',
    },
    {
      key: 'ai-key',
      target: '[data-tour="ai-panel"]',
      title: 'API Key',
      description: 'Enter your Google Gemini API key (free at aistudio.google.com).\n\nThe key is kept in this browser session only — never sent anywhere except Google.',
      placement: 'left',
      prerequisite: { kind: 'aiPanelOpen', message: 'Open the AI panel first.', autoFix: 'toggleAiPanel' },
    },
    {
      key: 'ai-prompt',
      target: '[data-tour="ai-prompt"]',
      title: 'Ask Anything',
      description: 'Describe what you want: "add a sofa and coffee table to the living room" or "suggest a color palette".\n\nThe AI sees your current floor plan.',
      placement: 'left',
      prerequisite: { kind: 'aiPanelOpen', message: 'Open the AI panel first.', autoFix: 'toggleAiPanel' },
    },
    {
      key: 'ai-apply',
      target: '[data-tour="ai-panel"]',
      title: 'Apply Proposals',
      description: 'When the AI suggests layout changes, an Apply button appears.\n\nPreview the diff overlay on the canvas, then apply or discard.',
      placement: 'left',
      prerequisite: { kind: 'aiPanelOpen', message: 'Open the AI panel first.', autoFix: 'toggleAiPanel' },
    },
  ],
}

export const TOURS = { core, materials, viewer3d, openings, ai }
export const OPTIONAL_TOUR_IDS = ['materials', 'viewer3d', 'openings', 'ai']
