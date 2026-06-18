"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EditorMock } from "./editor-mock";
import { Aurora } from "./aurora";
import { CONTLES_URL } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
      <Aurora preset="hero" />

      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <a
            href={CONTLES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow group inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/10 bg-white/[0.04] py-1 pl-1.5 pr-3 backdrop-blur-md transition-colors hover:border-white/20 hover:text-[var(--color-fg-muted)]"
          >
            <Image src="/contles.png" alt="" width={16} height={16} className="rounded-[3px]" />
            Built &amp; powered by Contles
            <ArrowUpRight className="size-3 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <h1 className="display mx-auto mt-7 max-w-4xl text-balance text-5xl text-white sm:text-7xl">
            We Only Make Captions.
            <br />
            <span className="text-magic">That&rsquo;s Why They&rsquo;re Better.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--color-fg-muted)]">
            Word-level timing, lossless export, and no watermark. The focused tool beats the
            all-in-one editors.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/signup" size="lg" variant="primary">
              Start free
              <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
            <Button href="/pricing" size="lg" variant="outline">
              See pricing
            </Button>
          </div>

          <p className="mono mt-5 text-xs text-[var(--color-fg-subtle)]">
            Desktop app for Mac &amp; Windows coming soon
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <EditorMock />
        </motion.div>
      </Container>
    </section>
  );
}
