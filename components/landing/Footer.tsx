// Site footer — contact info + logo, matching the design and using the
// exact contact details Josh provided.
import Image from "next/image";

export default function Footer() {
  return (
    <footer id="footer" className="bg-[#FCE4F0] text-zinc-900 px-6 md:px-10 py-10">
      <div className="site-container flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16">
        <Image
          src="/images/footer-logo.png"
          alt="Happy Tails Pet Grooming Cafe"
          width={110}
          height={110}
          className="w-24 h-auto md:w-28 shrink-0"
        />

        <div className="text-center md:text-left">
          <h3 className="font-bold text-zinc-800">Navigation</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-700">
            <li><a href="/" className="hover:text-brand-pink">Home</a></li>
            <li><a href="/#services" className="hover:text-brand-pink">Services</a></li>
            <li><a href="/#about" className="hover:text-brand-pink">About Us</a></li>
          </ul>
        </div>

        <div className="text-center md:text-left">
          <h3 className="font-bold text-zinc-800">Contact Us</h3>
          <ul className="mt-2 space-y-2 text-sm text-zinc-700">
            <li className="flex items-center gap-2 justify-center md:justify-start">
              <span aria-hidden>📍</span>
              364 Ricardo Commercial Bldg. Salcedo, Noveleta, Cavite
            </li>
            <li className="flex items-center gap-2 justify-center md:justify-start">
              <span aria-hidden>📞</span>
              0955 008 5317
            </li>
            <li className="flex items-center gap-2 justify-center md:justify-start">
              <span aria-hidden>✉️</span>
              happytails.pgc@gmail.com
            </li>
            <li className="flex items-center gap-2 justify-center md:justify-start">
              <span aria-hidden>📘</span>
              Happy Tails Pet Cafe - Noveleta
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
