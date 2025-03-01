export default function GridBackground() {
  return (
    <div className="fixed inset-0 z-[-1]">
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, black 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, black 80%)',
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
      <div 
        className="absolute inset-0 opacity-30" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(68, 68, 68, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(68, 68, 68, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '15px 15px',
          backgroundPosition: 'center center',
        }}
      />
    </div>
  );
}
