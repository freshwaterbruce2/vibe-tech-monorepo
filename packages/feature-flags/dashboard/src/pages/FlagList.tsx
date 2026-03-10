import { Edit2, Plus, Power, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FlagEditor } from '../components/FlagEditor';
import { FeatureFlag, api } from '../services/api';

export function FlagList() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | undefined>(undefined);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    try {
      const data = await api.getFlags();
      setFlags(data);
    } catch (error) {
      console.error('Failed to load flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingFlag(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flag?')) return;
    try {
      await api.deleteFlag(id);
      setFlags(flags.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Failed to delete flag:', error);
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await api.toggleFlag(flag.id, !flag.enabled);
      // Optimistic update
      setFlags(flags.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f)));
    } catch (error) {
      console.error('Failed to toggle flag:', error);
      loadFlags(); // Revert on error
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading flags...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
          <p className="text-gray-600">Manage your application feature toggles</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Flag
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Key / Name
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Environments
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {flags.map((flag) => (
              <tr key={flag.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{flag.key}</div>
                  <div className="text-sm text-gray-500">{flag.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    {flag.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={async () => handleToggle(flag)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      flag.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {Object.entries(flag.environments).map(([env, enabled]) => (
                      <span
                        key={env}
                        className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        title={`${env}: ${enabled ? 'On' : 'Off'}`}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(flag)}
                      className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => handleDelete(flag.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FlagEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        flag={editingFlag}
        onSave={loadFlags}
      />
    </div>
  );
}
