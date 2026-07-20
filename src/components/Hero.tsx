import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import AnimatedHeading from './AnimatedHeading'
import FadeIn from './FadeIn'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4'

export default function Hero() {
  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      {/* Full-screen background video — no overlay */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Foreground — selalu teks putih di atas video (tema tak mengubah hero) */}
      <div className="relative z-10 flex flex-col h-full min-h-screen text-white">
        <Navbar />

        <div className="px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-12 lg:pb-16">
          <div className="lg:grid lg:grid-cols-2 lg:items-end">
            {/* Left column */}
            <div>
              <AnimatedHeading
                text={'One ecosystem\nfor every operation.'}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal mb-4"
                style={{ letterSpacing: '-0.04em' }}
              />

              <FadeIn delay={800} duration={1000}>
                <p className="text-base md:text-lg text-gray-300 mb-5 max-w-xl">
                  UMS Ecosystem unifies your weighbridge, logistics, and
                  operations data into one live view.
                </p>
              </FadeIn>

              <FadeIn delay={1200} duration={1000}>
                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/dashboard"
                    className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Open Dashboard
                  </Link>
                  <a
                    href="#ecosystem"
                    className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-black transition-colors"
                  >
                    Explore Now
                  </a>
                </div>
              </FadeIn>
            </div>

            {/* Right column — tag */}
            <div className="flex items-end justify-start lg:justify-end mt-8 lg:mt-0">
              <FadeIn delay={1400} duration={1000}>
                <div className="liquid-glass border border-white/20 px-6 py-3 rounded-xl">
                  <span className="text-lg md:text-xl lg:text-2xl font-light">
                    Weigh. Track. Decide.
                  </span>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
