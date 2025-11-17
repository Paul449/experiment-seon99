'use client';
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
export default function Home() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.2, 2]);
  return (
    <main
      ref={ref}
      className="flex min-h-screen flex-col items-center justify-between p-24"
    >
      <motion.div style={{ scale }}>
        <Image
          src="/HaircutImage0.png"
          alt="Haircut image"
          width={180}
          height={37}
          priority
        />
      </motion.div>
    </main>
  );
}
