import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ShieldCheck,
  Smartphone,
  Zap,
  ArrowRight,
  CircleCheck,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Choose a plan",
    description: "Pick the plan that fits you.",
    icon: Smartphone,
  },
  {
    number: "02",
    title: "Verify number",
    description: "Quick and secure verification.",
    icon: ShieldCheck,
  },
  {
    number: "03",
    title: "Activate SIM",
    description: "Your number is ready in minutes.",
    icon: Zap,
  },
  {
    number: "04",
    title: "Start using",
    description: "Make calls, use data, and more.",
    icon: CircleCheck,
  },
];

export default function ActivationSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      id="how-it-works"
      className="relative isolate overflow-hidden bg-gradient-to-b from-white via-[#f8fff0] to-[#effbdc] px-5 py-20 sm:px-10 lg:px-16 lg:py-24"
    >
      {/* Ambient background */}
      <div className="pointer-events-none absolute -right-20 top-10 -z-10 h-80 w-80 rounded-full bg-lime-200/40 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-72 w-72 rounded-full bg-green-100/70 blur-[100px]" />

      <div className="mx-auto grid max-w-[1500px] items-center gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        {/* Left content */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.65 }}
            className="text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
          >
            Drag. Activate.
            <br />
            You’re{" "}
            <span className="text-[#389b16]">Ready.</span>
          </motion.h2>

          <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
            Getting started with Zylo is simple. Just drag your SIM
            and follow the steps to activate your number in minutes.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-2 rounded-full border border-lime-100 bg-white/80 px-4 py-2">
              <ShieldCheck size={17} className="text-green-600" />
              Secure verification
            </span>
            <span className="flex items-center gap-2 rounded-full border border-lime-100 bg-white/80 px-4 py-2">
              <Zap size={17} className="text-green-600" />
              Fast activation
            </span>
          </div>

          <button
            onClick={() =>
              document
                .getElementById("activation-steps")
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#101729] px-6 py-3.5 font-semibold text-white transition hover:bg-[#28354c]"
          >
            Start activation <ArrowRight size={18} />
          </button>
        </div>

        {/* Right visual and steps */}
        <div
          id="activation-steps"
          className="relative min-w-0 scroll-mt-24"
        >
          {/* Step cards */}
          <div className="relative z-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = activeStep === index;
              const isComplete = activeStep > index;

              return (
                <motion.button
                  key={step.number}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex min-h-[175px] flex-col items-center rounded-2xl border p-4 text-center transition-all duration-300 sm:min-h-[190px] sm:px-3 sm:py-5 ${
                    isActive
                      ? "border-lime-300 bg-[#e8ffb4] shadow-[0_12px_30px_rgba(132,204,22,0.12)]"
                      : "border-white bg-white/80 shadow-sm hover:border-lime-200"
                  }`}
                >
                  <span
                    className={`mb-3 grid h-10 w-10 place-items-center rounded-full ${
                      isActive || isComplete
                        ? "bg-[#a8f51f] text-slate-950"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isComplete ? (
                      <Check size={21} strokeWidth={3} />
                    ) : (
                      <Icon size={20} />
                    )}
                  </span>

                  <span className="text-xs font-bold text-slate-500">
                    STEP {step.number}
                  </span>

                  <span className="mt-2 text-sm font-bold text-slate-900">
                    {step.title}
                  </span>

                  <span className="mt-2 text-xs leading-5 text-slate-500">
                    {step.description}
                  </span>

                  {index < steps.length - 1 && (
                    <ArrowRight
                      size={15}
                      className="absolute -right-[11px] top-1/2 z-20 hidden -translate-y-1/2 text-lime-600 sm:block"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Animated route */}
          <div className="relative mt-6 h-[270px] overflow-hidden rounded-3xl sm:h-[320px]">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/70 via-lime-50/70 to-green-100/60" />

            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 600 300"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <motion.path
                d="M45 190 C110 270, 160 220, 230 170 S370 100, 440 170 S520 225, 560 130"
                stroke="#8be51c"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="8 10"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />

              {[45, 230, 440, 560].map((x, index) => (
                <motion.circle
                  key={x}
                  cx={x}
                  cy={[190, 170, 170, 130][index]}
                  r="6"
                  fill="#a8f51f"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.35,
                  }}
                />
              ))}
            </svg>

            {/* SIM illustration */}
            <motion.div
              className="absolute left-[8%] top-[35%] z-10"
              animate={{
                x: activeStep * 105,
                y: [0, -9, 0],
                rotate: [-12, -7, -12],
              }}
              transition={{
                x: { type: "spring", stiffness: 70, damping: 16 },
                y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                rotate: {
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              <img
                src="sim.png"
                alt="Zylo SIM"
                className="h-28 w-24 object-contain drop-shadow-[0_14px_14px_rgba(70,110,20,0.22)] sm:h-36 sm:w-32"
              />
            </motion.div>

            {/* Activation target */}
            <motion.div
              className="absolute bottom-7 right-[10%] grid h-20 w-28 place-items-center rounded-[50%] border border-lime-200 bg-white/90 shadow-[0_10px_40px_rgba(132,204,22,0.18)] sm:h-24 sm:w-36"
              animate={{
                boxShadow: [
                  "0 10px 30px rgba(132,204,22,0.12)",
                  "0 10px 50px rgba(132,204,22,0.35)",
                  "0 10px 30px rgba(132,204,22,0.12)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-lime-100">
                {activeStep === 3 ? (
                  <Check size={26} className="text-green-700" />
                ) : (
                  <Zap size={25} className="text-green-700" />
                )}
              </div>
            </motion.div>

            <div className="absolute bottom-4 left-5 rounded-full border border-white bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              {activeStep === 3
                ? "You're connected!"
                : `Step ${activeStep + 1} of 4 · ${steps[activeStep].title}`}
            </div>
          </div>

          {/* Current step description */}
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-3 text-sm text-slate-600"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-100 text-green-700">
              <Check size={17} />
            </span>
            {steps[activeStep].description}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
