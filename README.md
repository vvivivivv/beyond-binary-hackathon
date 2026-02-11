# aXcess 🌐♿️
> Excess Accessibility - A Parallel Multimodal Assistive Agent for the Modern Web.

Universal Assist is a browser extension designed to provide a consistent, user-controlled accessibility experience across any website, regardless of its underlying quality. Unlike traditional "overlays" that try to patch broken code, Universal Assist acts as an Assistive Agent, interpreting webpage content into a parallel, accessible layer.

[Video Presentation](https://youtu.be/7Dmm1--u0X8)
---

## 📖 Table of Contents
- [The Challenge](#-the-challenge)
- [Our Philosophy: Agent, Not Overlay](#-our-philosophy-agent-not-overlay)
- [Key Features](#-key-features)
- [Multimodal Innovation](#-multimodal-innovation)
- [Technical Architecture](#-technical-architecture)
- [Setup & Installation](#-setup--installation)
- [Judging Criteria Alignment](#%EF%B8%8F-judging-criteria-alignment)
- [Future Roadmap](#-future-roadmap-expanding-multimodal-nuance)

---

## 🚩 The Challenge
According to WebAIM’s 2024 report, 95.9% of homepages have detectable WCAG 2.0 failures. Most assistive technologies rely on websites being built correctly; when a site is poorly designed, the assistive tool breaks. 

Universal Assist closes this gap. Instead of fixing the website for the world, we interpret the website for the user.

## 🧠 Our Philosophy: Agent, Not Overlay
Traditional accessibility tools often fail because they try to "inject" fixes into a website's complex code. 
- ❌ Overlays: Modify DOM styles and hope the site works.
- ✅ Universal Assist: Extracts raw content → Interprets meaning via AI → Builds a parallel, accessible interaction layer in a controlled sidebar.

We use Transient Multimodal Anchors. When a user searches for specific information via Voice commands, we provide a temporary (4-second) visual highlight on the page for spatial orientation, while our parallel AI layer interprets the semantic meaning in the side panel.

---

## ✨ Key Features

### 🎙 Voice-Controlled Navigation
- Users can explore pages entirely through natural language. Command the agent to "Read body," "Scroll to bottom," "Summarise", or "Find images".
- Voice navigation commands are defined in `src/utils/constants.js`.
- Detailed execution logs can be viewed using the browser’s `Inspect Element` (Developer Tools → Console).

### 👁 AI Vision AI & OCR
- Image Analysis: For images missing alt-text, our agent uses semantic vision models to describe the scene (e.g., "A library with many books on a shelf").
- Document OCR: Specifically for PDFs, we utilize Tesseract.js to convert flat, inaccessible documents into searchable, readable text.

### 📝 AI Summarization & Q&A
- Using the Hugging Face Inference API, the agent can summarize complex articles into digestible bullet points or answer specific questions about the page content.

### ⚙️ Personalized User Profiles
- Universal Themes: Centralized control for font sizes and contrast levels (Normal, High, Maximum).
- Dynamic TTS: Speech rate control that persists across all websites.

---

## 🚀 Multimodal Innovation
We address the "single-modality" trap by integrating four core interaction modes:
1. Audio: High-quality Text-to-Speech with progress tracking.
2. Visual: High-contrast themes and AI-generated image descriptions.
3. Voice: Full speech-to-command pipeline for hands-free browsing.
4. Text: Intelligent summarization and semantic search.

---

## 🛠 Technical Architecture
The extension is built with React.js and Chrome Extension Manifest V3.

- App.jsx: The central hub managing non-blocking async loops for background AI processing.
- DOM Scanner: A robust extraction engine that identifies structure, headings, links, and media.
- Vision Engine: Connects to local and remote models for image-to-text transformation.
- OCR Pipeline: Integrates Tesseract.js and PDF.js for document reconstruction.
- Speech Hook: A custom useSpeech hook for robust browser-level synthesis.

---

## 📦 Setup & Installation

1. Clone the repo:
   ```bash
   git clone link(https://github.com/vvivivivv/beyond-binary-hackathon)
   cd beyond-binary-hackathon

2. Install dependencies:
    ```bash
    npm install

3. Build the extension:
    ```bash
    npm run build
    ```
    This will generate production files in the dist/ folder.

4. Load in Chrome:
   - Navigate to `chrome://extensions/` in Chrome
   - Enable `Developer` mode
   - Click `Load Unpacked` and select the generated `dist/` folder
   - The extension should now appear in your Chrome toolbar. Click on the Puzzle Icon and pin the extension.

5. Testing:
    Accessibility Testing Page
    - We recommend testing the [Accessible University (AU) demo page](https://projects.accesscomputing.uw.edu/au/before.html)
    - This fictional university homepage intentionally contains 22+ accessbility issues, making it ideal for testing accessibility-related features.

    Image Detection Test
    - Use the local file: `imagetest.html` located in the project root folder.
    - This file contains animals and everyday objects for testing image detection functionally.

    PDF OCR Testing
    - You can test OCR functionality using this [sample dinner menu PDF](https://assets.ctfassets.net/sahy2rpqbnsp/23uKsEtq9X6IivDeeFLeqt/cedd88a62248ed4a96b05319c40b349f/Scarpetta_Dinner_Menu_May_2024.pdf)

5. Microphone Setup:
   - Right click the extension and `Open Side Panel`
   - Click the Setup Mic button in the extension header
   - Grant microphone permissions when prompted
   - This enables voice-related features (eg. speech recognition).

---

## ⚖️ Judging Criteria Alignment

| Criteria | How We Meet It |
| :--- | :--- |
| Impact & Relevance (25%) | Addresses the 95.9% failure rate of modern homepages by creating a site-agnostic assistive agent that works even on "broken" websites. |
| Multimodal Innovation (30%) | Cohesive integration of Vision (OCR/Descriptions), Audio (TTS), and Voice (Commands) to ensure accessibility regardless of user ability. |
| Technical Execution (17%) | Manifest V3 compliant, modular React architecture with non-blocking async loops for background AI inference and local vision processing. |
| Usability & Accessibility (15%) | Personalization-first design. Adaptive contrast/font themes and transient highlights ensure a low-friction, high-autonomy experience. |
| Completeness (13%) | Fully functional PDF OCR pipeline, Voice Interface, and AI Summarization ready for immediate, practical deployment. |

---

## 🔮 Future Roadmap: Expanding Multimodal Nuance
Our architecture is designed to be an extensible foundation for future assistive technologies:

*   🤟 Sign Language Recognition:
      - Leveraging computer vision to interpret regional sign language dialects and gestures into browser navigation commands, addressing the isolation mentioned in the hackathon challenge.
*   📳 Haptic Navigation:
      - Integrating haptic feedback APIs to provide tactile cues for users with low vision, indicating page boundaries or the presence of interactive elements.
*   🤖 Local (Offline) AI:
      - Transitioning from cloud-based Inference APIs to local ONNX models to ensure total user privacy, lower latency, and accessibility even without an active internet connection.
*   🌍 Dialect & Context Awareness:
      - Fine-tuning AI models to recognize non-standardized gestures and regional language variations to better support underserved global communities.
        
---

> Universal Assist — *Fostering inclusive communities by interpreting the world, one page at a time.*














