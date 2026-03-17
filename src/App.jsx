import {
  Server,
  Database,
  HardDrive,
  Cloud,
  Film,
  Download,
  Shield,
  Network
} from 'lucide-react';
import ServiceCard from './components/ServiceCard.jsx';

const App = () => {
  const serverIP = "192.168.1.100";

  // Mock services data
  const services = [
    { name: 'Plex', icon: Film, isActive: true, url: 'http://192.168.1.100:32400' },
    { name: 'Nextcloud', icon: Cloud, isActive: true, url: 'http://192.168.1.100:8080' },
    { name: 'Portainer', icon: Server, isActive: true, url: 'http://192.168.1.100:9000' },
    { name: 'Database', icon: Database, isActive: true, url: 'http://192.168.1.100:5432' },
    { name: 'Storage', icon: HardDrive, isActive: false, url: 'http://192.168.1.100:8181' },
    { name: 'Downloads', icon: Download, isActive: true, url: 'http://192.168.1.100:8112' },
    { name: 'VPN', icon: Shield, isActive: true, url: 'http://192.168.1.100:51820' },
    { name: 'Network', icon: Network, isActive: false, url: 'http://192.168.1.100:3000' },
  ];

  return (
      <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* IP Display Section */}
          <div className="flex items-center justify-center">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-2xl" />

              {/* IP Container */}
              <div className="relative rounded-3xl border-2 border-emerald-500/30 bg-zinc-900/80 backdrop-blur-sm px-12 py-8 md:px-16 md:py-12">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-zinc-500">Server IP</span>
                  <span className="text-3xl md:text-5xl font-mono font-semibold text-emerald-400 tracking-wide">
                  {serverIP}
                </span>
                </div>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          <div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-6">Services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {services.map((service) => (
                  <ServiceCard Icon={service.icon}
                      key={service.name}
                      name={service.name}
                      isActive={service.isActive}
                      url={service.url}
                  />
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}

export default App