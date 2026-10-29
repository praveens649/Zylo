import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  Play,
  ShieldCheck,
  Users,
  Globe,
  Phone,
  Zap,
} from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Keep your", subtitle: "number private" },
  { icon: Users, title: "For personal", subtitle: "or business" },
  { icon: Globe, title: "Use anywhere", subtitle: "in the world" },
  { icon: Phone, title: "Easy activation", subtitle: "in minutes" },
];

const stats = [
  { icon: Globe, title: "Global Coverage", value: "190+ Countries" },
  { icon: Zap, title: "Instant Activation", value: "in Minutes" },
  { icon: Users, title: "Trusted by", value: "1M+ Users" },
];

export default function HeroSection() {
  return (
    <main
      id="home"
      className="min-h-screen overflow-hidden bg-white text-[#101729]"
    >
      {/* Navigation */}
      <nav className="relative z-20 mx-auto flex max-w-[1720px] items-center justify-between gap-6 px-6 py-5 lg:px-16">
        <a href="#home" className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#A8F51F] text-black">
            <Zap size={26} strokeWidth={2.8} />
          </span>
          <span className="text-3xl font-extrabold tracking-tight">
            Zylo
          </span>
        </a>

        <div className="hidden items-center gap-8 text-sm font-medium lg:flex">
          {["Home", "Features", "How it works", "Plans", "Support"].map(
            (item, index) => (
              <a
                key={item}
                href={["#home", "#features", "#how-it-works", "#plans", "#support"][index]}
                className={`py-2 transition hover:text-lime-600 ${
                  index === 0
                    ? "border-b-[3px] border-[#A8F51F]"
                    : ""
                }`}
              >
                {item}
              </a>
            )
          )}
        </div>

        <div className="hidden items-center gap-7 sm:flex">
          <a href="/login" className="text-sm font-medium">
            Sign in
          </a>
          <a
            href="/signup"
            className="flex items-center gap-3 rounded-full bg-[#A8F51F] px-6 py-3 font-bold transition hover:-translate-y-0.5 hover:bg-lime-300"
          >
            Get a Zylo SIM <ArrowRight size={19} />
          </a>
        </div>

        <a
          href="/signup"
          className="rounded-full bg-[#A8F51F] px-4 py-3 text-sm font-bold sm:hidden"
        >
          Get a SIM
        </a>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-[1720px] items-center gap-4 px-6 pb-16 pt-8 lg:min-h-[690px] lg:grid-cols-2 lg:px-16">
        {/* Left content */}
        <div className="relative z-10">
          <div className="mb-5 flex items-start gap-5">
            <span className="text-3xl font-extrabold text-lime-500">
              01
            </span>
            <p className="pt-2 text-xs font-semibold tracking-[0.24em] text-slate-600 sm:text-sm">
              NEXT-GEN TELECOM
            </p>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-5xl font-extrabold leading-[1.04] tracking-[-0.055em] sm:text-6xl xl:text-7xl"
          >
            One SIM.
            <br />
            More Possibilities.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8"
          >
            A smarter way to stay connected. Get a Zylo SIM for
            personal, business or travel needs and enjoy seamless
            connectivity anywhere in the world.
          </motion.p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/signup"
              className="flex items-center gap-4 rounded-full bg-[#A8F51F] px-7 py-4 font-bold shadow-lg shadow-lime-200/50 transition hover:-translate-y-1 hover:shadow-xl"
            >
              Get a Zylo SIM <ArrowRight size={21} />
            </a>

            <a
              href="#how-it-works"
              className="flex items-center gap-3 font-semibold"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-md ring-1 ring-slate-100 transition hover:scale-105">
                <Play size={19} fill="currentColor" />
              </span>
              Watch how it works
            </a>
          </div>

          {/* Statistics */}
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-3">
            {stats.map(({ icon: Icon, title, value }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-100 bg-white shadow-sm">
                  <Icon size={22} />
                </span>
                <div>
                  <p className="text-xs text-slate-500">{title}</p>
                  <p className="mt-1 text-sm font-bold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right animated SIM visual */}
        <div className="relative mx-auto flex min-h-[430px] w-full max-w-[680px] items-center justify-center sm:min-h-[550px]">
          <div className="absolute inset-[12%] rounded-full bg-lime-200/40 blur-[90px]" />

          {/* Globe */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute h-[65%] aspect-square rounded-full border border-white/80 shadow-[inset_-20px_-15px_50px_rgba(16,100,70,0.12),0_0_60px_rgba(168,245,31,0.15)]"
          >
            <div className="absolute inset-[12%] rounded-full border border-white/70" />
            <div className="absolute inset-[28%] rounded-full border border-white/70" />
            <div className="absolute inset-y-0 left-1/2 border-l border-white/70" />
            <div className="absolute inset-x-0 top-1/3 border-t border-white/70" />
            <div className="absolute inset-x-0 top-2/3 border-t border-white/70" />
          </motion.div>

          {/* Orbit rings
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute h-[34%] w-[100%] rounded-[50%] border-2 border-lime-400/70"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            className="absolute h-[55%] w-[105%] rounded-[50%] border border-lime-400/60"
          /> */}

          {/* Main SIM image: place your transparent PNG in public/images */}
          <motion.img
            src="/public/orbit.png"
            alt="Zylo SIM card with global connectivity"
            initial={{ opacity: 0, scale: 0.75, y: 30 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -13, 0],
              rotate: [-5, -2, -5],
            }}
            transition={{
              opacity: { duration: 0.7 },
              scale: { duration: 0.7 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative z-10 w-[68%] drop-shadow-[0_25px_25px_rgba(25,60,10,0.22)]"
          />

          {/* Floating feature cards */}
          {features.map(({ icon: Icon, title, subtitle }, index) => (
            <motion.div
              key={title}
              animate={{ y: [0, -7, 0] }}
              transition={{
                duration: 4 + index,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute z-20 flex items-center gap-3 rounded-2xl border border-white bg-white/90 px-3 py-3 shadow-[0_12px_35px_rgba(20,40,10,0.07)] backdrop-blur-md sm:gap-4 sm:px-5 sm:py-4 ${
                [
                  "left-0 top-[19%]",
                  "right-0 top-[17%]",
                  "left-0 bottom-[23%]",
                  "right-0 bottom-[24%]",
                ][index]
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime-100 sm:h-12 sm:w-12">
                <Icon size={23} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold leading-5 sm:text-sm">
                {title}
                <br />
                {subtitle}
              </span>
            </motion.div>
          ))}

          <div className="absolute bottom-[5%] h-12 w-[65%] rounded-[50%] border-b-4 border-lime-300 bg-gradient-to-b from-white to-slate-100 shadow-xl" />
        </div>
      </section>

      <a
        href="#how-it-works"
        aria-label="Scroll to next section"
        className="mx-auto mb-5 flex w-fit items-center gap-2 text-xs text-slate-500 lg:hidden"
      >
        Scroll to explore <ArrowDown size={15} />
      </a>
    </main>
  );
}
