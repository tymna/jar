/* Decorative backdrop — DESIGN.md "Background".
   A single flat grey field with the giant chunky saving words cropped off
   the viewport edges. The playfulness is the type itself: each word is a
   soft duotone (near-white face + cherry offset shadow, see globals.css), so
   it pops like a sticker without any doodles. Pure scenery: aria-hidden, no
   data, no interaction. */

export default function JarBackdrop() {
  return (
    <div aria-hidden className="jar-backdrop">
      <span className="jar-word top-[4%] left-[-3%] -rotate-2">save</span>
      <span className="jar-word top-[30%] right-[-6%] rotate-2">stash</span>
      <span className="jar-word top-[57%] left-[-5%] rotate-1">keep</span>
      <span className="jar-word bottom-[2%] right-[2%] -rotate-2">goal</span>
    </div>
  );
}
