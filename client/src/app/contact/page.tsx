import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nous contacter — Nyvara Sunglasses',
  description: 'Prenez contact avec l\'équipe Nyvara. Nous sommes à votre écoute pour toute question ou demande de support.',
};

export default function ContactPage() {
  return (
    <div style={{
      maxWidth: '640px',
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
        marginBottom: '20px',
        letterSpacing: '0.05em'
      }}>
        Contactez-nous
      </h1>
      
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px', fontSize: '1.05rem' }}>
        Une question sur nos modèles, une commande ou besoin d'un conseil ? Notre équipe vous répond sous 24h.
      </p>

      <div style={{
        background: 'var(--color-cream)',
        border: '1px solid var(--color-cream-dark)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', color: '#555' }}>Nom Complet</label>
            <input 
              type="text" 
              placeholder="Votre nom" 
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--color-cream-dark)',
                borderRadius: '8px',
                background: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', color: '#555' }}>Adresse Email</label>
            <input 
              type="email" 
              placeholder="votre@email.com" 
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--color-cream-dark)',
                borderRadius: '8px',
                background: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', color: '#555' }}>Message</label>
            <textarea 
              rows={5}
              placeholder="Comment pouvons-nous vous aider ?" 
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid var(--color-cream-dark)',
                borderRadius: '8px',
                background: 'white',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            type="button"
            style={{
              background: 'var(--color-black)',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '10px',
              transition: 'background 0.2s'
            }}
          >
            Envoyer le Message
          </button>
        </div>
      </div>

      <div style={{
        marginTop: '50px',
        textAlign: 'center',
        fontSize: '0.95rem',
        color: '#666',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div>📍 Tunis, Tunisie</div>
        <div>✉️ <a href="mailto:contact@nyvara.tn" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>contact@nyvara.tn</a></div>
      </div>
    </div>
  );
}
