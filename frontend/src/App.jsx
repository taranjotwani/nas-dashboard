import React, { useContext, useState } from 'react';
import {
  Server,
  Database,
  Film,
  Download,
  Album,
  Network
} from 'lucide-react';
import ServiceCard from './components/ServiceCard.jsx';
import ServerIPDisplay from './components/ServerIPDisplay.jsx';
import YoutubeDownloadCard from './components/YoutubeDownloadCard.jsx';
import LinkEditorPanel from './components/LinkEditorPanel.jsx';
import LinkTileCard, { AddLinkCard } from './components/LinkTileCard.jsx';
import LinkContext from './context/LinkContext.jsx';

const App = () => {
  const {
    healthData,
    serverIp,
    loading,
    links,
    linksLoading,
    linksError,
    addLink,
    updateLink,
    deleteLink
  } = useContext(LinkContext);
  const [editorState, setEditorState] = useState({
    mode: 'add',
    isOpen: false,
    link: null
  });
  const [formError, setFormError] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);

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

  const services = Object.entries(healthData).map(([serviceName, serviceData]) => ({
    name: displayNameMap[serviceName] || serviceName,
    icon: iconMap[serviceName] || Server,
    url: serviceData.url,
    isActive: serviceData.status === 'active'
  }));

  const normalizedLinks = links.map((link) => ({
    id: link.id ?? link._id ?? link.url,
    name: link.name || link.title || 'Untitled Link',
    url: link.url || link.href || ''
  }));

  const openAddLink = () => {
    setFormError('');
    setEditorState({ mode: 'add', isOpen: true, link: null });
  };

  const openEditLink = (link) => {
    setFormError('');
    setEditorState({ mode: 'edit', isOpen: true, link });
  };

  const closeEditor = () => {
    setFormError('');
    setEditorState({ mode: 'add', isOpen: false, link: null });
  };

  const handleSaveLink = async (values) => {
    if (!values.name || !values.url) {
      setFormError('Name and URL are required.');
      return;
    }

    setIsSavingLink(true);
    setFormError('');

    try {
      if (editorState.mode === 'edit' && editorState.link?.id) {
        await updateLink(editorState.link.id, values);
      } else {
        await addLink(values);
      }
      closeEditor();
    } catch (error) {
      setFormError(error.message || 'Failed to save link.');
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleDeleteLink = async (link) => {
    if (!link.id) {
      setFormError('Unable to delete this link because it is missing an id.');
      return;
    }

    const confirmed = window.confirm(`Delete ${link.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteLink(link.id);
      if (editorState.link?.id === link.id) {
        closeEditor();
      }
    } catch (error) {
      setFormError(error.message || 'Failed to delete link.');
    }
  };

  return (
      <div className="min-h-screen bg-zinc-950 p-2 md:p-4">
        <div className="mx-auto max-w-7xl space-y-4">
          {/* IP Display Section */}
          <ServerIPDisplay serverIp={serverIp} />

          {/* YouTube Download Section */}
          <YoutubeDownloadCard />

          {editorState.isOpen ? (
            <LinkEditorPanel
              mode={editorState.mode}
              initialValues={editorState.link ? {
                name: editorState.link.name,
                url: editorState.link.url
              } : undefined}
              onCancel={closeEditor}
              onSubmit={handleSaveLink}
              isSubmitting={isSavingLink}
              errorMessage={formError || linksError}
            />
          ) : null}

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

          <div>
            <div className="mb-4 flex items-center justify-between gap-3 md:mb-6">
              <h2 className="text-lg font-semibold text-zinc-200 md:text-xl">Quick Links</h2>
              <button
                type="button"
                onClick={openAddLink}
                className="rounded-xl border border-emerald-600/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20"
              >
                + Add Link
              </button>
            </div>

            {linksLoading ? (
              <div className="text-center text-zinc-400">Loading links...</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:gap-4 sm:grid-cols-1 lg:grid-cols-4 xl:grid-cols-5">
                <AddLinkCard onClick={openAddLink} />
                {normalizedLinks.map((link) => (
                  <LinkTileCard
                    key={link.id}
                    name={link.name}
                    url={link.url}
                    onEdit={() => openEditLink(link)}
                    onDelete={() => handleDeleteLink(link)}
                  />
                ))}
              </div>
            )}

            {!linksLoading && normalizedLinks.length === 0 ? (
              <div className="mt-4 text-center text-zinc-500">
                No saved links yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
  );
}

export default App