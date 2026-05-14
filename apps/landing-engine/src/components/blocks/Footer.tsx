'use client';
import { useEditorStore } from '@/store/editorStore';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const businessName = useEditorStore((state) => state.document.businessName);
  const primaryColor = useEditorStore((state) => state.document.primaryColor);

  return (
    <footer className="bg-slate-950 text-slate-400 py-24 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          {/* Brand Col */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white font-black text-sm italic">
                  {businessName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xl font-bold text-white tracking-tighter">{businessName}</span>
            </div>
            <p className="text-sm leading-relaxed mb-8">
              Creamos soluciones innovadoras para impulsar el crecimiento de tu negocio en la era digital.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Empresa</h3>
            <ul className="space-y-4 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">Sobre Nosotros</li>
              <li className="hover:text-white cursor-pointer transition-colors">Nuestros Servicios</li>
              <li className="hover:text-white cursor-pointer transition-colors">Casos de Éxito</li>
              <li className="hover:text-white cursor-pointer transition-colors">Blog</li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Soporte</h3>
            <ul className="space-y-4 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">Centro de Ayuda</li>
              <li className="hover:text-white cursor-pointer transition-colors">Contacto</li>
              <li className="hover:text-white cursor-pointer transition-colors">Privacidad</li>
              <li className="hover:text-white cursor-pointer transition-colors">Términos</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Contacto</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4" style={{ color: primaryColor }} />
                <span>contacto@{businessName.toLowerCase().replace(/\s/g, '')}.com</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4" style={{ color: primaryColor }} />
                <span>+52 (55) 1234-5678</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
                <span>Torre Alfa, Nivel 12, Ciudad de México</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} {businessName}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sistemas Operativos</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
