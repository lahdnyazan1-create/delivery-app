# Project Master Specification: "Emotional PWA Food Delivery App"

## 1. Project Overview & Identity
You are an expert Frontend Developer and UX/UI Engineer. Your task is to build a Progressive Web App (PWA) for a local food delivery service. 
- **Target Audience:** Local users (max 1000 active users).
- **Budget Constraint:** $0 operational cost for frontend features. No paid external APIs for animations or sounds.
- **Core Philosophy:** "Emotional Design" and "Micro-interactions". The app must feel alive, responsive, and tactile (Native-like experience).

## 2. Tech Stack Requirements
Strictly use the following technologies. Do not install heavy alternatives.

| Category | Technology / Library |
| :--- | :--- |
| **Framework** | Next.js (App Router) or React (Vite) - *Choose based on initial setup* |
| **Styling** | Tailwind CSS |
| **Animations** | Framer Motion (for spring physics and page transitions) |
| **Icons** | Lucide React (or similar lightweight SVG icons) |
| **Mapping** | Leaflet + React-Leaflet (with free OpenStreetMap tiles) |
| **Native APIs** | HTML5 Canvas, Web Audio API, Web Vibration API |

## 3. Cursor AI Strict Directives (CRITICAL)
- **Do NOT hallucinate paid APIs:** Rely exclusively on standard Web APIs.
- **Component Modularity:** Break down features into small, reusable components (e.g., `<LivingCard />`, `<SwipeButton />`).
- **Performance First:** Only animate `transform` and `opacity` properties to guarantee 60fps on low-end mobile devices.
- **Mobile-First Design:** The UI must be optimized for mobile screens (touch targets > 44px, safe area insets).
- **Batch Implementation:** When asked to implement a feature, write the complete logical code (HTML/JSX, Tailwind classes, and state management) in one go to save prompt tokens.

## 4. UI/UX Design System
- **Colors:** 
  - Primary: Fire Orange (`#FF6B35`) - for CTAs and appetite stimulation.
  - Secondary: Trust Blue (`#1A2B4C`) - for backgrounds and text.
  - Accent: Vibrant Green (`#00C853`) - for success states.
- **Glassmorphism:** Use `backdrop-blur` and translucent backgrounds for overlays, cards, and floating UI elements.
- **Typography:** Modern Arabic/English font (e.g., Cairo, Tajawal, or Inter).

## 5. Core Features & Micro-Interactions (Implementation Specs)

### A. The "Living" Food Cards (Dish Browsing)
- Implement dish cards using Framer Motion.
- **Interaction:** On hover/touch, the card should scale up slightly (scale: 1.02) using a gentle spring animation.
- **Visuals:** Add subtle CSS gradients. For hot dishes, use a lightweight SVG path animation to simulate steam.

### B. "Fly to Cart" Animation
- When the user clicks "Add to Cart", do NOT just update a number.
- **Interaction:** Clone the dish image, animate it flying in a parabolic curve towards the cart icon using Framer Motion's `layoutId` or AnimatePresence.
- **Feedback:** Upon arrival, trigger a lightweight haptic feedback (`navigator.vibrate(10)`) and a UI pop animation on the cart icon.

### C. Scratch Card Offers (Canvas API)
- Implement a promotional component using the HTML5 `<canvas>` element.
- **Interaction:** The top layer of the canvas must simulate a silver scratch-off ticket. Users touch/drag to erase the canvas and reveal the discount code beneath.
- **Feedback:** Trigger continuous micro-haptics (`navigator.vibrate(5)`) during the scratching motion, and generate a white-noise scratch sound using the `Web Audio API` (No external MP3 files).

### D. Swipe to Confirm (Tactile Checkout)
- Replace the standard "Order Now" button with a draggable slider.
- **Interaction:** The user must drag a thumb icon from left to right. Background color shifts from neutral to `#00C853` as the slider progresses.
- **Feedback:** 
  - On complete swipe: Trigger a strong haptic pattern (`navigator.vibrate([40, 40, 100])`).
  - Play an ascending 2-tone success chime strictly generated via `AudioContext` (Web Audio API).
  - Show a celebratory Lottie or Framer Motion explosion.

### E. Smooth Driver Tracking (Map Interpolation)
- Use Leaflet for the map. 
- **The Problem:** GPS updates arrive every 10-15 seconds, causing the marker to jump.
- **The Solution:** Implement a Linear Interpolation (LERP) algorithm within a `requestAnimationFrame` loop. 
- **Interaction:** The marker (a custom SVG scooter) must glide smoothly between the old coordinate and the new coordinate, recalculating its bearing (rotation angle) to face the direction of movement.

## 6. PWA & Native Feel Requirements
- **Manifest:** Include a fully configured `manifest.json` (standalone display, theme colors).
- **No Text Selection:** Apply `user-select: none;` to buttons and interactive cards to prevent accidental text highlighting on mobile.
- **Overscroll:** Use `overscroll-behavior: none;` on the body to prevent the native pull-to-refresh if implementing a custom one, or to stop rubber-banding on the layout.