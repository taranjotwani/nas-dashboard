import React from 'react';

const LinkContext = React.createContext();


const LinkProvider = ({ children }) => {
  const [links, setLinks] = React.useState([]);
  const [linksLoading, setLinksLoading] = React.useState(true);
  const [linksError, setLinksError] = React.useState('');
  const [healthData, setHealthData] = React.useState({});
  const [serverIp, setServerIp] = React.useState('Loading...');
  const [loading, setLoading] = React.useState(true);

  const fetchLinks = async () => {
    try {
      setLinksLoading(true);
      setLinksError('');
      const response = await fetch('/api/links');
      if (!response.ok) {
        throw new Error(`Failed to fetch links: ${response.status}`);
      }
      const data = await response.json();
      setLinks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch links:', error);
      setLinks([]);
      setLinksError(error.message || 'Failed to fetch links.');
    } finally {
      setLinksLoading(false);
    }
  };

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health/data');
      const data = await response.json();
      setHealthData(data.activeServices || {});
      setServerIp(data.serverIp || 'Unavailable');
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      setHealthData({});
      setServerIp('Unavailable');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchHealthData();
    fetchLinks();
  }, []);


  const addLink = async (newLink) => {
    try {
      setLinksError('');
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink)
      });
      if (!response.ok) {
        throw new Error(`Failed to add link: ${response.status}`);
      }
      const data = await response.json();
      setLinks(prevLinks => [...prevLinks, data]);
      return data;
    } catch (error) {
      console.error('Failed to add link:', error);
      setLinksError(error.message || 'Failed to add link.');
      throw error;
    }
  };

  const deleteLink = async (linkId) => {
    try {
      setLinksError('');
      const response = await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Failed to delete link: ${response.status}`);
      }
      setLinks(prevLinks => prevLinks.filter(link => link.id !== linkId));
    } catch (error) {
      console.error('Failed to delete link:', error);
      setLinksError(error.message || 'Failed to delete link.');
      throw error;
    }
  };

  const updateLink = async (linkId, updatedLink) => {
    try {
      setLinksError('');
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLink)
      });
      if (!response.ok) {
        throw new Error(`Failed to update link: ${response.status}`);
      }
      const data = await response.json();
      setLinks(prevLinks => prevLinks.map(link => link.id === linkId ? data : link));
      return data;
    } catch (error) {
      console.error('Failed to update link:', error);
      setLinksError(error.message || 'Failed to update link.');
      throw error;
    }
  };



  return (
    <LinkContext.Provider value={{ 
      links,
      setLinks,
      linksLoading,
      linksError,
      fetchLinks,
      addLink,
      deleteLink,
      updateLink,
      healthData,
      serverIp,
      loading,
      fetchHealthData
    }}>
      {children}
    </LinkContext.Provider>
  );
};

export { LinkProvider };

export default LinkContext;