import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-black">
      <div className="text-center max-w-md">
        <div className="text-[10rem] leading-none font-semibold tracking-[-0.05em] bg-gradient-to-br from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">404</div>
        <h1 className="text-2xl font-semibold tracking-tight mt-4">Page not found</h1>
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">The page you&apos;re looking for wandered off. Let&apos;s get you back.</p>
        <Link href="/" className="btn-primary mt-8 inline-flex">Take me home</Link>
      </div>
    </div>
  );
}
