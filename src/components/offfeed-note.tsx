type OfffeedNoteProps = {
  audience: "her" | "him";
  placement?: "home" | "discover" | "lookbook" | "category";
};

const notes = {
  her: {
    home: "Your body is not a before picture. It is already worthy of being celebrated.",
    discover: "There is no one way to be beautiful. There is only your way.",
    lookbook: "Every shape, every size, every version of you deserves to take up space.",
    category: "Dress for the body you have, and the life you are living right now.",
  },
  him: {
    home: "Confidence has no dress code. Show up as every version of yourself.",
    discover: "Strong, soft, bold, quiet — you never have to choose just one.",
    lookbook: "Your body is not a trend. Your style is yours to define.",
    category: "There is no mould to fit. Make room for your own kind of confidence.",
  },
} as const;

export function OfffeedNote({ audience, placement = "discover" }: OfffeedNoteProps) {
  const quote = notes[audience][placement];

  return (
    <aside
      aria-label="OFFFEED note"
      className="relative mx-auto my-10 max-w-[1440px] overflow-hidden rounded-[1.5rem] border border-[#eadfd7] bg-[linear-gradient(110deg,#f6e9e6_0%,#fbf7f1_52%,#edf1e9_100%)] px-6 py-9 text-center sm:my-14 sm:px-12 sm:py-12"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-12 size-40 rounded-full border border-white/80 sm:size-56" />
      <p className="relative text-[10px] font-semibold uppercase tracking-[.25em] text-[#9a7a70]">A little note from OFFFEED</p>
      <blockquote className="relative mx-auto mt-4 max-w-3xl font-display text-3xl leading-[1.15] tracking-[-.025em] text-[#55443b] sm:text-4xl lg:text-[2.7rem]">
        “{quote}”
      </blockquote>
      <span aria-hidden="true" className="relative mx-auto mt-6 block h-px w-12 bg-[#c99b98]" />
      <p className="relative mt-3 text-[10px] font-medium uppercase tracking-[.2em] text-[#9a7a70]">Wear what feels like you</p>
    </aside>
  );
}
