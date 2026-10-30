import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  BriefcaseBusiness,
  Plane,
  ShieldCheck,
  Users,
} from "lucide-react";

const features = [
  {
    title: "Business Numbers",
    description: "Show your business name when you call",
    icon: BriefcaseBusiness,
    illustration: "business-number.png",
    color: "from-lime-100 to-green-50",
  },
  {
    title: "Travel Ready",
    description: "Stay connected abroad",
    icon: Plane,
    illustration: "travel-globe.png",
    color: "from-sky-100 to-lime-50",
  },
  {
    title: "Privacy First",
    description: "Keep your personal number private",
    icon: ShieldCheck,
    illustration: "private-shield.png",
    color: "from-green-100 to-lime-50",
  },
  {
    title: "Multiple Numbers",
    description: "One SIM, many possibilities",
    icon: Users,
    illustration: "multiple-number.png",
    color: "from-lime-100 to-emerald-50",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative isolate overflow-hidden bg-gradient-to-r from-white via-[#fbfff8] to-[#f4ffe9] px-5 py-16 sm:px-10 lg:px-16 lg:py-20"
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute -right-20 top-0 -z-10 h-96 w-96 rounded-full bg-lime-200/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 -z-10 h-72 w-72 rounded-full bg-green-100/50 blur-[90px]" />

      <div className="mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-[0.8fr_2fr] lg:gap-12">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          <h2 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.05em] text-[#101729] sm:text-5xl xl:text-6xl">
            Use It
            <br />
            <span className="text-green-700">Your Way.</span>
          </h2>

          <p className="mt-5 max-w-md text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            Zylo is built for your lifestyle. Whether it’s for
            business, travel or personal use, stay connected
            on your terms.
          </p>

          <a
            href="#dashboard"
            className="group mt-6 inline-flex items-center gap-3 font-semibold text-sm text-[#101729] underline decoration-lime-400 decoration-2 underline-offset-4 transition hover:text-green-700"
          >
            Explore all features
            <ArrowRight
              size={18}
              className="text-lime-600 transition-transform group-hover:translate-x-1"
            />
          </a>

          {/* Scroll indicator */}
          <a
            href="#dashboard"
            aria-label="Scroll to more features"
            className="mt-8 hidden h-24 w-5 flex-col items-center justify-between text-lime-500 lg:flex"
          >
            <span className="h-full border-l border-dashed border-lime-400" />
            <ArrowDown size={16} />
          </a>
        </motion.div>

        {/* Four feature cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.12,
                }}
                whileHover={{ y: -7 }}
                className="group relative flex min-h-[260px] flex-col overflow-hidden rounded-[22px] border border-white bg-white/85 p-4 shadow-[0_12px_32px_rgba(20,40,10,0.06)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_18px_40px_rgba(80,150,20,0.13)] sm:min-h-[280px]"
              >
                {/* Card heading */}
                <div className="relative z-10 flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-100 text-green-800">
                    <Icon size={21} strokeWidth={2.5} />
                  </span>

                  <div>
                    <h3 className="text-sm font-bold leading-5 text-[#101729]">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-[11px] leading-[1.5] text-slate-500">
                      {feature.description}
                    </p>
                  </div>
                </div>

                {/* Illustration area */}
                <div
                  className={`relative mt-auto flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${feature.color}`}
                >
                  <div className="absolute h-28 w-28 rounded-full bg-white/70 blur-xl transition-transform duration-500 group-hover:scale-125" />

                  <motion.img
                    src={feature.illustration}
                    alt={feature.title}
                    loading="lazy"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 3 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative z-10 h-full w-full object-contain p-2 drop-shadow-md transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Fallback icon when illustration assets are not ready */}
                  <div className="absolute inset-0 -z-0 grid place-items-center">
                    <Icon size={62} className="text-green-700/20" />
                  </div>
                </div>

                <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-lime-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Decorative floating SIM */}
      <motion.img
        src="/images/zylo-sim.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        animate={{
          y: [0, -12, 0],
          rotate: [-10, -4, -10],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -top-12 left-[48%] hidden w-16 opacity-90 drop-shadow-xl lg:block"
      />
    </section>
  );
}
