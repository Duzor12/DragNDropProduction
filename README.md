# DragNDropProduction
An AI Powered DAW that runs on the browser

## UGAHacks X Project Submission

### Team Members
[David Uzor, John Akindele, Million Yahoness, Akir Goode]

### Project Purpose
DragNDropProduction is a browser-based Digital Audio Workstation (DAW) powered by artificial intelligence. It allows users to create, edit, and mix music directly in their web browser with the assistance of AI-generated samples and beats.

### Tools and Technologies Used
- Frontend:
  - SvelteKit
  - Tone.js for audio processing
  - NeoDrag for drag-and-drop functionality
- Backend:
  - Python for AI processing

### Features
- Browser-based audio workstation
- AI-powered sample generation
- Beat generation capabilities
- Real-time audio processing
- Drag and drop interface

### Challenges and Solutions
One of our main challenges was finding a suitable audio interface library that could handle waveform visualization and track management in the browser. After evaluating several options, we discovered Waveform Playlist, which provided the core functionality we needed. However, integrating it with SvelteKit required careful handling of the lifecycle hooks and DOM manipulation.

Another significant challenge was managing the state between the waveform interface and our AI generation features. We solved this by implementing a robust event system that kept the UI in sync with the audio engine state.

The drag and drop functionality also presented initial hurdles, particularly with positioning accuracy and performance. We overcame this by using the NeoDrag library and implementing custom position calculations to ensure precise track placement.

### External APIs and Frameworks
- Tone.js for audio manipulation
- Waveform-playlist api for timeline components

### Project Setup and Running Instructions
1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd DragNDropProduction
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

Note: Make sure you have Node.js and npm installed on your system before running these commands.

### Development Requirements
- Node.js (v16 or higher)
- npm (comes with Node.js)
- Modern web browser with Web Audio API support

### Hackathon Information
This project was created for UGAHacks X (February 7-9, 2025) and follows all hackathon guidelines:
- Created within the official hacking period (starting February 7th, 8 PM)
- Original work with no pre-existing code
- Submitted through Devpost
- Complies with team size requirements (4 or fewer members)

### Repository
[https://github.com/Duzor12/DragNDropProduction.git]

### License
[MIT]
