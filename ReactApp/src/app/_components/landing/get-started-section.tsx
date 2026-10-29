import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Globe,
  ShieldCheck,
} from "lucide-react";

const benefits = [
  { icon: Zap, label: "Instant activation" },
  { icon: Globe, label: "Global coverage" },
  { icon: ShieldCheck, label: "Flexible plans" },
];

export default function GetStartedSection() {
  return (
    <section
      id="get-started"
      className="relative isolate overflow-hidden bg-gradient-to-br from-white via-[#fbfff7] to-[#f0ffdf] px-5 py-16 sm:px-10 lg:min-h-[490px] lg:px-16 lg:py-20"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-20 top-0 -z-10 h-[450px] w-[450px] rounded-full bg-lime-200/40 blur-[100px]" />

      <div className="mx-auto grid max-w-[1500px] items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          <div className="mb-5 flex items-center gap-4">
            <span className="text-xl font-extrabold text-lime-500">
              05
            </span>
            <span className="text-xs font-semibold tracking-[0.16em] text-slate-500">
              STAY CONNECTED, ANYWHERE
            </span>
          </div>

          <h2 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.05em] text-[#101729] sm:text-5xl lg:text-6xl">
            Get Your
            <br />
            <span className="text-green-700">Zylo SIM</span> Today.
          </h2>

          <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
            Join thousands who use Zylo for a smarter, simpler
            and more flexible way to stay connected.
          </p>

          <a
            href="/signup"
            className="group mt-7 inline-flex items-center gap-4 rounded-xl bg-[#A8F51F] px-7 py-4 font-bold text-[#101729] shadow-lg shadow-lime-200/40 transition duration-300 hover:-translate-y-1 hover:bg-lime-300 hover:shadow-xl"
          >
            Get a Zylo SIM
            <ArrowRight
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </a>

          {/* Benefits */}
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-4">
            {benefits.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-100 text-green-800">
                  <Icon size={19} strokeWidth={2.4} />
                </span>
                <span className="text-xs font-medium text-slate-600 sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right illustration */}
        <div className="relative mx-auto flex min-h-[350px] w-full max-w-[760px] items-center justify-center sm:min-h-[440px]">
          {/* Ambient lighting */}
          <div className="absolute inset-[12%] rounded-full bg-lime-300/30 blur-[85px]" />

          {/* Orbit rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 35,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute h-[52%] w-[90%] rounded-[50%] border-2 border-lime-400/40"
          />

          <motion.div
            animate={{ rotate: -360 }}
            transition={{
              duration: 45,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute h-[75%] w-[95%] rounded-[50%] border border-lime-300/50"
          />

          {/* Floating decorative dots */}
          <motion.span
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute left-[12%] top-[20%] h-3 w-3 rounded-full bg-lime-400 shadow-[0_0_15px_#a8f51f]"
          />

          <motion.span
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute right-[12%] bottom-[22%] h-4 w-4 rounded-full bg-lime-400 shadow-[0_0_15px_#a8f51f]"
          />

          {/* SIM unboxing artwork */}
          <motion.img
            src="/zylo-unboxing.png"
            alt="Zylo SIM card gift box with a SIM and global connectivity artwork"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            animate={{ y: [0, -9, 0] }}
            transition={{
              opacity: { duration: 0.8 },
              scale: { duration: 0.8 },
              y: {
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            className="relative z-10 max-h-[440px] w-full object-contain drop-shadow-[0_25px_30px_rgba(60,100,20,0.12)]"
          />
        </div>
      </div>
    </section>
  );
}
