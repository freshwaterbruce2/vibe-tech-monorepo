import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import React, { useState } from 'react';
import { FeatureFlag, api } from '../services/api';

interface FlagEditorProps {
  flag?: FeatureFlag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function FlagEditor({ flag, open, onOpenChange, onSave }: FlagEditorProps) {
  const [key, setKey] = useState(flag?.key || '');
  const [name, setName] = useState(flag?.name || '');
  const [description, setDescription] = useState(flag?.description || '');
  const [type, setType] = useState<FeatureFlag['type']>(flag?.type || 'boolean');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (flag) {
        await api.updateFlag(flag.id, { name, description });
      } else {
        await api.createFlag({
          key,
          name,
          description,
          type,
          enabled: false,
          environments: {},
          rules: [],
          tags: [],
        });
      }
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert('Failed to save flag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold">
              {flag ? 'Edit Flag' : 'Create Flag'}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!flag && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flag Key</label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="feature.new_ui"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="New User Interface"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={3}
              />
            </div>

            {!flag && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="boolean">Boolean</option>
                  <option value="variant">Variant</option>
                  <option value="percentage">Percentage</option>
                  <option value="kill_switch">Kill Switch</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Flag'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
