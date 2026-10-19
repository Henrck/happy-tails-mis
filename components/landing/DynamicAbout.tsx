import Image from 'next/image';
export default function DynamicAbout({backgroundUrl,heading,description}:{backgroundUrl?:string|null;heading:string;description:string}){
return <section id="about" className="relative bg-zinc-900"><div className="relative min-h-[390px] w-full md:min-h-[470px]"><Image src={backgroundUrl||'/images/about-bg.png'} alt="Happy Tails pets" fill unoptimized={!!backgroundUrl} className="object-cover"/><div className="absolute inset-0 bg-black/60"/><div className="site-container relative flex min-h-[390px] flex-col items-center justify-center px-6 py-14 text-center md:min-h-[470px]"><h2 className="text-3xl font-bold text-white md:text-4xl">{heading}</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-white md:text-base">{description}</p></div></div></section>;
}
