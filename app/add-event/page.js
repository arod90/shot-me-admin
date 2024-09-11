'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AddEvent() {
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [lineup, setLineup] = useState(['']);
  const [priceTiers, setPriceTiers] = useState([{ name: '', price: '' }]);
  const [dressCode, setDressCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `event-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback({ message: '', type: '' });

    try {
      const imageUrl = await uploadImage();

      const { data, error } = await supabase.from('events').insert([
        {
          event_name: eventName,
          event_date: eventDate,
          location,
          description,
          image_url: imageUrl,
          lineup: lineup.filter((artist) => artist.trim() !== ''),
          price_tiers: priceTiers.reduce((acc, tier) => {
            if (tier.name && tier.price) {
              acc[tier.name] = parseFloat(tier.price);
            }
            return acc;
          }, {}),
          dress_code: dressCode,
        },
      ]);

      if (error) throw error;

      console.log('Event added successfully:', data);
      setFeedback({ message: 'Event created successfully!', type: 'success' });
      // Reset form
      setEventName('');
      setEventDate('');
      setLocation('');
      setDescription('');
      setImageFile(null);
      setImagePreview('');
      setLineup(['']);
      setPriceTiers([{ name: '', price: '' }]);
      setDressCode('');
    } catch (error) {
      console.error('Error adding event:', error);
      setFeedback({
        message: 'Error creating event. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLineupChange = (index, value) => {
    const newLineup = [...lineup];
    newLineup[index] = value;
    setLineup(newLineup);
  };

  const addLineupField = () => {
    setLineup([...lineup, '']);
  };

  const removeLineupField = (index) => {
    const newLineup = lineup.filter((_, i) => i !== index);
    setLineup(newLineup);
  };

  const handlePriceTierChange = (index, field, value) => {
    const newPriceTiers = [...priceTiers];
    newPriceTiers[index][field] = value;
    setPriceTiers(newPriceTiers);
  };

  const addPriceTier = () => {
    setPriceTiers([...priceTiers, { name: '', price: '' }]);
  };

  const removePriceTier = (index) => {
    const newPriceTiers = priceTiers.filter((_, i) => i !== index);
    setPriceTiers(newPriceTiers);
  };

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-white">
        Agregar Nuevo Evento
      </h2>
      {feedback.message && (
        <div
          className={`mb-4 p-2 rounded ${
            feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {feedback.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="eventName"
            className="block text-sm font-medium text-gray-400"
          >
            Nombre del Evento
          </label>
          <input
            type="text"
            id="eventName"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1"
            required
          />
        </div>
        <div>
          <label
            htmlFor="eventDate"
            className="block text-sm font-medium text-gray-400"
          >
            Fecha del Evento
          </label>
          <input
            type="datetime-local"
            id="eventDate"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1"
            required
          />
        </div>
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-400"
          >
            Ubicación
          </label>
          <input
            type="text"
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1"
            required
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-400"
          >
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1"
            rows="3"
          ></textarea>
        </div>
        <div>
          <label
            htmlFor="eventImage"
            className="block text-sm font-medium text-gray-400"
          >
            Imagen del Evento
          </label>
          <input
            type="file"
            id="eventImage"
            accept="image/*"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-sm file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-700"
          />
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-2 h-32 object-cover rounded-md"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">
            Lineup
          </label>
          {lineup.map((artist, index) => (
            <div key={index} className="flex mt-1">
              <input
                type="text"
                value={artist}
                onChange={(e) => handleLineupChange(index, e.target.value)}
                className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1"
                placeholder="Nombre del artista"
              />
              <button
                type="button"
                onClick={() => removeLineupField(index)}
                className="ml-2 px-2 py-1 bg-red-500 text-white rounded-md"
              >
                -
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLineupField}
            className="mt-2 px-2 py-1 bg-green-500 text-white rounded-md"
          >
            + Añadir Artista
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">
            Categorias de Precio
          </label>
          {priceTiers.map((tier, index) => (
            <div key={index} className="flex mt-1">
              <input
                type="text"
                value={tier.name}
                onChange={(e) =>
                  handlePriceTierChange(index, 'name', e.target.value)
                }
                className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1 mr-2"
                placeholder="Nombre de la categoria"
              />
              <input
                type="number"
                value={tier.price}
                onChange={(e) =>
                  handlePriceTierChange(index, 'price', e.target.value)
                }
                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1"
                placeholder="Precio"
              />
              <button
                type="button"
                onClick={() => removePriceTier(index)}
                className="ml-2 px-2 py-1 bg-red-500 text-white rounded-md"
              >
                -
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPriceTier}
            className="mt-2 px-2 py-1 bg-green-500 text-white rounded-md"
          >
            + Añadir Categoria de Precio
          </button>
        </div>
        <div>
          <label
            htmlFor="dressCode"
            className="block text-sm font-medium text-gray-400"
          >
            Código de Vestimenta
          </label>
          <input
            type="text"
            id="dressCode"
            value={dressCode}
            onChange={(e) => setDressCode(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-1"
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          {loading ? 'Agregando...' : 'Agregar Evento'}
        </button>
      </form>
    </div>
  );
}
