# Fish Animation Showcase

This is a standalone animation showcase that demonstrates different ways to animate the fish icon from your Karl Fish application. It's completely separate from your main codebase and won't affect any existing functionality.

## What's Included

### 🎨 Animation Types
- **Wiggle Fins**: Gentle fin movement with rotation and scaling
- **Swim**: Swimming motion with horizontal movement and rotation
- **Swallow Hook**: Scale and rotation effects simulating swallowing
- **Bounce**: Up and down bouncing motion
- **Pulse**: Breathing/pulsing effect with opacity changes

### 🛠️ Implementation Methods
- **CSS Animations**: Pure CSS keyframe animations (lightweight, performant)
- **Framer Motion**: React-based animations with physics and complex easing

## How to Use

1. Open `index.html` in your browser
2. Use the dropdown to select different animation types
3. Use the Play/Pause button to control animations
4. Compare CSS vs Framer Motion implementations side by side

## File Structure

```
animate/
├── index.html          # Main showcase page
├── styles.css          # CSS animations and styling
└── README.md          # This file
```

## Integration Options

### Option 1: CSS Animations (Recommended for your app)
- Lightweight and performant
- No additional dependencies
- Easy to integrate into your existing Header component
- Just add CSS classes to the existing `<Fish />` component

### Option 2: Framer Motion
- More complex animations possible
- Physics-based effects
- Requires adding Framer Motion dependency
- More control over animation timing and easing

## Code Examples

### CSS Integration
```tsx
// In your Header.tsx
<div className="logo">
  <Fish size={24} className="fish-wiggle" />
  Karl Fish
</div>
```

### Framer Motion Integration
```tsx
// Install: npm install framer-motion
import { motion } from 'framer-motion';

<motion.div
  animate={{ rotate: [0, -10, 10, 0] }}
  transition={{ duration: 2, repeat: Infinity }}
>
  <Fish size={24} />
</motion.div>
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS animations work in all browsers
- Framer Motion requires React 16.8+
- Responsive design for mobile and desktop

## Performance Notes

- CSS animations are GPU-accelerated
- Framer Motion uses requestAnimationFrame
- Both respect `prefers-reduced-motion` for accessibility
- Animations pause when tab is not visible

## Customization

You can easily modify:
- Animation durations in CSS keyframes
- Easing functions for smoother motion
- Colors and sizes
- Add new animation types
- Combine multiple animations

This showcase is completely self-contained and won't interfere with your existing Karl Fish application!

