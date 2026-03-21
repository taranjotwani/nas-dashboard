import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  HardDrive,
  Cloud,
  Film,
  Download,
  Album,
  Network
} from 'lucide-react';
import ServiceCard from './components/ServiceCard.jsx';
import ServerIPDisplay from './components/ServerIPDisplay.jsx';

const App = () => {
  const [services, setServices] = useState([]);
  const [serverIp, setServerIp] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  // Map service names to icons
  const iconMap = {
    jellyfin: Film,
    filebrowser: Database,
    sabnzbd: Download,
    immich: Album,
    prowlarr: Network
  };

  // Map service names to display names
  const displayNameMap = {
    jellyfin: 'Jellyfin',
    filebrowser: 'FileBrowser',
    sabnzbd: 'SabNzbD',
    immich: 'Immich',
    prowlarr: 'Prowlarr'
  };

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const response = await fetch('/api/health/data');
        const data = await response.json();

        // Set server IP from response
        setServerIp(data.serverIp);

        // Build services array from the response
        const servicesList = Object.entries(data.activeServices).map(
          ([serviceName, serviceData]) => ({
            name: displayNameMap[serviceName] || serviceName,
            icon: iconMap[serviceName] || Server,
            url: serviceData.url,
            isActive: serviceData.status === 'active'
          })
        );

        setServices(servicesList);
      } catch (error) {
        console.error('Failed to fetch health data:', error);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, []);

  return (
      <div className="min-h-screen bg-zinc-950 p-2 md:p-4">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* IP Display Section */}
          <ServerIPDisplay serverIp={serverIp} />

          {/* Services Grid */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-zinc-200 mb-4 md:mb-6 text-center">Services</h2>
            {loading ? (
              <div className="text-center text-zinc-400">Loading services...</div>
            ) : services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {services.map((service) => (
                    <ServiceCard Icon={service.icon}
                        key={service.name}
                        name={service.name}
                        url={service.url}
                        isActive={service.isActive}
                    />
                ))}
              </div>
            ) : (
              <div className="text-center text-zinc-400">No services available</div>
            )}
          </div>
        </div>
      </div>
  );
}

export default App