'use client'

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Image3DTilt() {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-[800px] h-[600px] rounded-2xl overflow-hidden cursor-pointer"
      >
        {/* Image */}
        <motion.div
          style={{
            transformStyle: "preserve-3d",
            transform: "translateZ(75px)",
          }}
          className="absolute inset-0"
        >
          <img
            src="/HaircutImage0.png"
            alt="3D Effect Image"
            className="w-full h-full object-cover rounded-2xl"
          />
        </motion.div>

        {/* Shadow overlay for depth */}
        <motion.div
          style={{
            transformStyle: "preserve-3d",
            transform: "translateZ(0px)",
          }}
          className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 rounded-2xl pointer-events-none"
        />

        {/* Shine effect */}
        <motion.div
          style={{
            transformStyle: "preserve-3d",
            transform: "translateZ(80px)",
            background: `radial-gradient(circle at ${useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"])} ${useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"])}, rgba(255,255,255,0.3) 0%, transparent 50%)`,
          }}
          className="absolute inset-0 pointer-events-none rounded-2xl"
        />
      </motion.div>

      <div className="absolute bottom-8 text-white text-center">
        <p className="text-xl font-semibold">Move your mouse over the image</p>
        <p className="text-sm opacity-70 mt-2">3D Tilt Effect with Framer Motion</p>
      </div>
    </div>
  );
}