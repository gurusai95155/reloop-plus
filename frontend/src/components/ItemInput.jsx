import { useState } from 'react';

const CATEGORIES = ['Electronics', 'Furniture', 'Appliances', 'Clothing', 'Other'];
const CONDITIONS = ['Like new', 'Good', 'Fair', 'Poor', 'Broken'];
const AGES = ['Under 1 year', '1-3 years', '3-5 years', '5+ years'];

export default function ItemInput({ onSubmit }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    try {
      await onSubmit({
        description: description.trim(),
        category: category || null,
        condition: condition || null,
        age: age || null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="item-input" onSubmit={handleSubmit}>
      <label>
        Description (required)
        <textarea
          placeholder="e.g. Old phone, cracked screen, battery drains fast"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
        />
      </label>
      <div className="optional-fields">
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Condition
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">—</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Age
          <select value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">—</option>
            {AGES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" disabled={loading || !description.trim()}>
        {loading ? 'Getting recommendation…' : 'Get AI recommendation'}
      </button>
    </form>
  );
}
