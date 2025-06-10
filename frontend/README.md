# Walkability Visualization

An interactive visualization tool for exploring urban walkability data through a game-like interface. This project provides a dynamic, real-time view of urban environments with a focus on walkability metrics and article clustering.

## Features

- **Interactive Navigation**: WASD controls for smooth movement through the urban landscape
- **Real-time Coordinate Display**: Shows precise world coordinates of the cursor
- **Performance Monitoring**: FPS counter for performance tracking
- **Responsive Design**: Automatically adapts to window size
- **Grid System**: Visual representation of world units with a clean grid overlay
- **Article Visualization**: Displays article points in the urban space
- **Smooth Movement**: Fixed time-step physics for consistent movement speed

## Technical Architecture

### Core Components

1. **Canvas-based Rendering**
   - Uses HTML5 Canvas for efficient 2D rendering
   - Implements a custom viewport system
   - Handles dynamic scaling and world-to-screen coordinate conversion

2. **Game Loop System**
   - Fixed time-step physics (120 Hz)
   - Accumulator-based time management
   - Frame rate independent movement
   - Performance optimization with frame limiting

3. **Input Handling**
   - Keyboard state tracking for WASD movement
   - Mouse position tracking with world coordinate conversion
   - Responsive to window resizing

### Key Constants

```typescript
const MAX_VISIBLE_UNITS = 2;    // View radius in world units
const PLAYER_SPEED = 0.5;       // Movement speed in units/second
const FIXED_DT = 1/120;         // Physics update rate (120 Hz)
const MAX_CATCHUP_STEPS = 5;    // Maximum physics steps per frame
```

### Data Structures

1. **Vec2 Interface**
   ```typescript
   interface Vec2 {
       x: number;
       y: number;
   }
   ```
   - Represents 2D coordinates in world space
   - Used for player position, cursor position, and movement vectors

2. **ArticlePoint Interface**
   ```typescript
   interface ArticlePoint {
       id: string;
       x: number;
       y: number;
       title: string;
   }
   ```
   - Represents article data points in the visualization
   - Includes position and metadata

### Rendering Pipeline

1. **Viewport Management**
   - Calculates appropriate scale based on window size
   - Centers view on player position
   - Handles coordinate transformations

2. **Grid Rendering**
   - Draws a light gray grid representing world units
   - Updates dynamically with player movement
   - Optimized to only render visible area

3. **Article Visualization**
   - Renders article points as blue circles
   - Implements viewport culling for performance
   - Scales appropriately with viewport

4. **UI Overlays**
   - Coordinate display in top-left corner
   - FPS counter in top-right corner
   - Semi-transparent backgrounds for readability

## Performance Optimizations

1. **Viewport Culling**
   - Only renders objects within visible area
   - Reduces unnecessary draw calls
   - Scales with viewport size

2. **Fixed Time Step**
   - Ensures consistent movement speed
   - Prevents physics instability
   - Handles variable frame rates gracefully

3. **State Management**
   - Uses React refs for mutable game state
   - Prevents unnecessary re-renders
   - Maintains smooth performance

## Getting Started

1. **Installation**
   ```bash
   npm install
   ```

2. **Development**
   ```bash
   npm run dev
   ```

3. **Building**
   ```bash
   npm run build
   ```

## Controls

- **W**: Move up
- **A**: Move left
- **S**: Move down
- **D**: Move right
- **Mouse**: View cursor position in world coordinates

## Technical Notes

- Movement speed is fixed at 0.5 units per second
- Physics updates at 120 Hz for smooth motion
- Grid represents 1x1 world units
- Viewport shows 4x4 world units (2 units radius)
- Performance optimized for 60+ FPS

## Future Enhancements

1. **Planned Features**
   - Biome system for different urban areas
   - Article clustering visualization
   - Path finding and navigation
   - Data filtering and search

2. **Technical Improvements**
   - WebGL rendering for better performance
   - Multi-threaded physics calculations
   - Improved memory management
   - Enhanced mobile support

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
