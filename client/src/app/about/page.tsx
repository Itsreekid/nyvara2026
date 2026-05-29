import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'À propos — Nyvara Sunglasses',
  description: 'Découvrez l\'histoire de Nyvara, créateur de lunettes de soleil de luxe personnalisées en Tunisie.',
};

export default function AboutPage() {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '80px 24px 120px',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-black)',
      lineHeight: '1.8'
    }}>
      <h1 style={{
        fontFamily: 'var(--font-editorial)',
        fontSize: '3rem',
        fontWeight: 'normal',
        textAlign: 'center',
        marginBottom: '40px',
        letterSpacing: '0.05em'
      }}>
        À Propos de Nyvara
      </h1>
      
      <div style={{ fontSize: '1.15rem', color: '#555', marginBottom: '40px', textAlign: 'center', fontStyle: 'italic' }}>
        "La façon dont vous voyez le jour. Créez des lunettes au style unique."
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', fontSize: '1.05rem', color: '#333' }}>
        <p>
          Fondée en Tunisie, <strong>Nyvara</strong> est née de la passion pour le design contemporain et l’artisanat d’art. 
          Nous croyons que les lunettes de soleil ne sont pas simplement un accessoire, mais le reflet de votre personnalité et de votre vision unique.
        </p>

        <p>
          Chaque paire de lunettes Nyvara est conçue avec une attention méticuleuse portée aux détails, alliant des matériaux haut de gamme 
          et une protection UV optimale. Notre concept exclusif de carrousel interactif vous permet d’explorer différentes teintes et montures 
          pour trouver la pièce parfaite qui complètera votre look.
        </p>

        <p>
          Notre mission est de vous offrir des produits exceptionnels qui marient parfaitement esthétique luxueuse et confort quotidien, 
          tout en rendant hommage au raffinement moderne.
        </p>
      </div>

      <div style={{
        marginTop: '60px',
        borderTop: '1px solid var(--color-cream-dark)',
        paddingTop: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          fontFamily: 'var(--font-editorial)',
          fontSize: '1.5rem',
          color: 'var(--color-gold)',
          marginBottom: '8px'
        }}>
          Nyvara Tunisia
        </div>
        <p style={{ fontSize: '0.9rem', color: '#777', margin: 0 }}>
          Lunettes de soleil de luxe &amp; Style sur mesure.
        </p>
      </div>
    </div>
  );
}
