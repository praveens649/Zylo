import { motion } from "framer-motion";
import { ArrowRight, LockKeyhole, Signal } from "lucide-react";

export default function DashboardSection() {
  return (
    <section
      id="dashboard"
      className="relative isolate overflow-hidden bg-gradient-to-br from-white via-[#fbfff8] to-[#effcde] px-5 py-16 sm:px-10 lg:min-h-[680px] lg:px-16 lg:py-20"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-20 top-10 -z-10 h-[480px] w-[480px] rounded-full bg-lime-200/40 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-72 w-72 rounded-full bg-green-100/60 blur-[100px]" />

      <div className="mx-auto grid max-w-[1500px] items-center gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          <h2 className="text-5xl font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-6xl">
            Manage
            <br />
            Everything
            <br />
            <span className="text-green-700">Easily.</span>
          </h2>

          <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
            View your plan, check usage, recharge and manage multiple
            numbers — all from a simple dashboard.
          </p>

          <a
            href="/dashboard"
            className="mt-7 inline-flex items-center gap-3 rounded-xl bg-[#101729] px-6 py-4 text-sm font-semibold text-white transition hover:-translate-y-1 hover:bg-slate-800"
          >
            See Dashboard Preview
            <ArrowRight size={18} />
          </a>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="flex items-center gap-2 rounded-full border border-lime-100 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600">
              <LockKeyhole size={15} className="text-green-700" />
              Secure management
            </span>
            <span className="flex items-center gap-2 rounded-full border border-lime-100 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600">
              <Signal size={15} className="text-green-700" />
              Real-time usage
            </span>
          </div>
        </motion.div>

        {/* Complete uploaded image: phone + feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-[900px]"
        >
          {/* Ambient glow behind image */}
          <div className="absolute inset-[15%] -z-10 rounded-full bg-lime-300/30 blur-[90px]" />

          <motion.img
            src="section.png"
            alt="Zylo mobile dashboard with phone number management, flexible plans, instant recharge and data usage tracking"
            animate={{ y: [0, -7, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="block h-auto w-full object-contain drop-shadow-[0_20px_35px_rgba(60,100,20,0.10)] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,black_62%,transparent_98%)]"
          />
        </motion.div>
      </div>
    </section>
  );
}
