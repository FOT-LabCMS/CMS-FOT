import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Loader2, ServerCrash, Search } from 'lucide-react';
import api from '../../api/axiosInstance';
import LocationCard from '../../components/Common/LocationCard';
import LocationNode from '../../components/locations/LocationNode';
import EditLocationModal from '../../components/locations/EditLocationModal';
import DeleteLocationModal from '../../components/locations/DeleteLocationModal';

const buildTree = (locations) => {
  const locationMap = {};
  const tree = [];

  locations.forEach(location => {
    locationMap[location.id] = { ...location, children: [] };
  });

  locations.forEach(location => {
    if (location.parentLocationId && locationMap[location.parentLocationId]) {
      locationMap[location.parentLocationId].children.push(locationMap[location.id]);
    } else {
      tree.push(locationMap[location.id]);
    }
  });

  return tree;
};

const ViewLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLocation, setEditingLocation] = useState(null);
  const [deletingLocation, setDeletingLocation] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/locations');
        if (response.data?.success) {
          setLocations(response.data.locations);
        } else {
          throw new Error('Failed to fetch locations from the server.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'An unknown error occurred.');
        console.error("Error fetching locations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const locationTree = useMemo(() => buildTree(locations), [locations]);

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (location) => {
    setEditingLocation(location);
  };

  const handleDeleteClick = (location) => {
    setDeletingLocation(location);
  };

  const handleCloseModals = () => {
    setEditingLocation(null);
    setDeletingLocation(null);
  };

  const handleUpdateSuccess = (updatedLocation) => {
    setLocations(prev => prev.map(l => l.id === updatedLocation.id ? updatedLocation : l));
    setEditingLocation(null);
    setFeedback({ type: 'success', message: `Location "${updatedLocation.name}" updated successfully.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteSuccess = (deletedId) => {
    const deletedName = locations.find(l => l.id === deletedId)?.name || 'Location';
    setLocations(prev => prev.filter(l => l.id !== deletedId));
    setDeletingLocation(null);
    setFeedback({ type: 'success', message: `"${deletedName}" deleted successfully.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-[var(--color-text-secondary)]">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">Loading Storage Locations...</h3>
          <p>Please wait while we fetch the data.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-danger)]">
          <ServerCrash size={40} />
          <h3 className="text-lg font-semibold">Failed to Load Locations</h3>
          <p className="max-w-md">{error}</p>
        </div>
      );
    }

    if (filteredLocations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-text-secondary)]">
          <MapPin size={40} />
          <h3 className="text-lg font-semibold">No Locations Found</h3>
          <p>You haven't defined any storage locations yet. Add one to get started.</p>
        </div>
      );
    }

    // If searching, show cards. Otherwise, show the tree.
    if (searchTerm) {
      return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
        {locationTree.map(node => (
          <LocationNode
            key={node.id}
            node={node}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
    <main
      className="
        min-h-screen
        px-4 py-5
        sm:px-6
        lg:px-8 lg:py-8
      "
    >
      <div className="mx-auto w-full max-w-7xl">
          {/* Page header */}
          <header className="mb-8 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                      <MapPin size={14} />
                      Storage
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    Storage Locations
                  </h1>
                </div>
                <div className="shrink-0">
                  <Link
                    to="/locations/add"
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                  >
                    <Plus size={18} />
                    Add New Location
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Search and Filter Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by location name..."
                className="w-full max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-12 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-tint)]"
              />
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 animate-in fade-in duration-200">
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Content Area */}
          {renderContent()}

          {/* Edit Location Modal Popup */}
          {editingLocation && (
            <EditLocationModal
              location={editingLocation}
              allLocations={locations}
              onClose={handleCloseModals}
              onSuccess={handleUpdateSuccess}
            />
          )}

          {/* Delete Location Confirmation Popup */}
          {deletingLocation && (
            <DeleteLocationModal
              location={deletingLocation}
              onClose={handleCloseModals}
              onSuccess={handleDeleteSuccess}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewLocations;