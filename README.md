![ElevenLabs STT Dashboard](./public/logo-with-text.webp)

A modern, feature-rich web application for transcribing audio files using the ElevenLabs Speech-to-Text API. Built with Vue 3, TypeScript, and Tailwind CSS.

## ✨ Features

### 🎵 Audio Processing

- **Multiple Format Support** - Upload MP3, WAV, M4A, and other audio formats
- **Region Selection** - Select specific portions of audio for targeted transcription
- **Visual Waveform** - Interactive audio visualization with WaveSurfer.js
- **Audio Duration Detection** - Automatic duration calculation for uploaded files

### 🗣️ Advanced Transcription

- **Multi-Language Support** - Auto-detect or specify from 100+ supported languages
- **Speaker Diarization** - Identify and separate different speakers in the audio
- **Word-Level Timestamps** - Precise timing information for each word
- **Real-time Sync** - Click on words to jump to audio position

### 💾 Data Management

- **Local Storage** - All transcriptions stored locally using IndexedDB
- **Audio Caching** - Efficient blob storage for uploaded audio files
- **Export Options** - Export as TXT, JSON, or SRT subtitle format
- **Retry Mechanism** - Automatic retry for failed transcriptions

### 🎨 Modern UI/UX

- **Dark/Light Theme** - Beautiful themes with smooth transitions
- **Responsive Design** - Works perfectly on desktop and mobile devices
- **Real-time Updates** - Live status updates during processing
- **Interactive Timeline** - Visual representation of transcription progress

## 🖼️ Screenshots

### Main Dashboard

<img alt="MainDashboardImage" src="https://github.com/user-attachments/assets/08546be1-29a4-42aa-b617-097933e32573">

### Audio Region Selection

<img alt="UploadProcessWithRegionSelection" src="https://github.com/user-attachments/assets/50545655-d24a-4e97-956b-786da295c11c">

### Multi-Speaker Transcription View

<img alt="TranscriptionViewWithMultipleSpeakers" src="https://github.com/user-attachments/assets/d497474f-ec21-4bae-a656-fded542440c2">

### Light Mode

<img alt="DashboardInLightMode" src="https://github.com/user-attachments/assets/a0171e78-d387-4f08-9e60-69d06da8f836">

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- ElevenLabs API key with Speech-to-Text permissions

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/elevenlabs-stt-dashboard.git
   cd elevenlabs-stt-dashboard
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
# Build the application
pnpm build

# Preview the production build
pnpm preview
```

## 🔑 Getting Your ElevenLabs API Key

1. Visit [ElevenLabs](https://elevenlabs.io) and create an account
2. Navigate to your profile settings
3. Generate an API key with **Speech-to-Text** permissions
4. Enter your API key in the dashboard settings

> ⚠️ **Important**: Ensure your API key has the required `speech_to_text` permissions enabled.

## 🌐 Live Demo

Try the live demo at: **[eleven-stt-dash.fabraham.dev](https://eleven-stt-dash.fabraham.dev)**

> 🛡️ **Privacy Note**: The demo is hosted on Cloudflare Pages (free tier). For production use or sensitive audio files, we recommend hosting your own instance for better security and privacy control.

## 🛠️ Tech Stack

- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Reka UI (shadcn-vue)
- **Icons**: Lucide Vue
- **Audio Processing**: WaveSurfer.js
- **HTTP Client**: Axios
- **Database**: IndexedDB (Dexie.js)
- **Build Tool**: Vite
- **Package Manager**: pnpm

## 📁 Project Structure

```
src/
├── components/          # Reusable Vue components
│   ├── ui/             # shadcn-vue UI components
│   ├── ApiKeyInput.vue # Secure API key management
│   ├── AudioFileInput.vue # Audio upload with waveform
│   ├── TranscriptionOutput.vue # Results display
│   └── TranscriptionCard.vue # Overview cards
├── composables/        # Vue composables
│   └── useTranscriptions.ts # Transcription state management
├── lib/                # Core utilities
│   ├── elevenlabs-api.ts # ElevenLabs API integration
│   ├── database.ts     # IndexedDB operations
│   └── audio-processor.ts # Audio file processing
├── views/              # Page components
│   ├── HomeView.vue    # Main dashboard
│   └── TranscriptionView.vue # Detailed transcription view
└── router/             # Vue Router configuration
```

## 🔧 Configuration

### Supported Audio Formats

- MP3, WAV, M4A, OGG, FLAC
- Maximum file size: 100MB
- Recommended: WAV/FLAC for best quality

### Supported Languages

The dashboard supports 100+ languages including:

- **Auto-detect** (recommended)
- English, Spanish, French, German, Italian
- Chinese (Mandarin & Cantonese), Japanese, Korean
- Arabic, Hindi, Portuguese, Russian
- And many more...

### Transcription Options

- **Model**: `scribe_v1` (ElevenLabs' latest STT model)
- **Speaker Diarization**: Enabled by default
- **Audio Events Tagging**: Enabled for better accuracy
- **Language Detection**: Auto-detect or manual selection

## 🏗️ Architecture

### Data Flow

1. **Upload** → Audio file processed and stored in IndexedDB
2. **Process** → File sent to ElevenLabs API with selected options
3. **Store** → Response cached locally with word-level timestamps
4. **Display** → Interactive transcription with audio sync
5. **Export** → Multiple format options (TXT, JSON, SRT)

### Storage Strategy

- **IndexedDB**: Transcription data and metadata
- **Blob Storage**: Audio files cached locally
- **LocalStorage**: User preferences and API keys

## 🚀 Deployment

### Cloudflare Pages (Recommended)

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `pnpm build`
3. Set output directory: `dist`
4. Deploy automatically on every push

### Other Platforms

- **Vercel**: Works out of the box
- **Netlify**: Compatible with drag-and-drop deployment
- **GitHub Pages**: Requires workflow configuration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
5. Push and create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io) for their excellent Speech-to-Text API
- [Vue.js](https://vuejs.org) team for the amazing framework
- [shadcn](https://ui.shadcn.com) for the beautiful UI components
- [WaveSurfer.js](https://wavesurfer-js.org) for audio visualization

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/elevenlabs-stt-dashboard/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/elevenlabs-stt-dashboard/discussions)
- 📧 **Email**: mail@fabraham.dev

---

<div align="center">
  <strong>Made with ❤️ and Vue.js</strong>
  <br />
  <sub>Transform your audio into accurate transcriptions with the power of ElevenLabs AI</sub>
</div>
