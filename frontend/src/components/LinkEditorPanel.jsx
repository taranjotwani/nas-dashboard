import React from 'react';

const emptyValues = {
  name: '',
  url: ''
};

const LinkEditorPanel = ({ mode, initialValues, onCancel, onSubmit, isSubmitting, errorMessage }) => {
  const [formValues, setFormValues] = React.useState(initialValues || emptyValues);

  React.useEffect(() => {
    setFormValues(initialValues || emptyValues);
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: formValues.name.trim(),
      url: formValues.url.trim()
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-cyan-300 md:text-xl">
            {mode === 'edit' ? 'Edit Link' : 'Add Link'}
          </h2>
          <p className="text-sm text-zinc-400">
            Save a display name and URL for a quick-launch tile.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <form className="grid gap-4 md:grid-cols-[1fr,1.2fr,auto]" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Name
          <input
            type="text"
            name="name"
            value={formValues.name}
            onChange={handleChange}
            placeholder="Docs"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition focus:border-cyan-500"
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          URL
          <input
            type="url"
            name="url"
            value={formValues.url}
            onChange={handleChange}
            placeholder="https://example.com"
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none transition focus:border-cyan-500"
            required
            disabled={isSubmitting}
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Link'}
          </button>
        </div>
      </form>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-red-300">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
};

export default LinkEditorPanel;