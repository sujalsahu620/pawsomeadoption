"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function CreatePost() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    age: "",
    breed: "",
    category: "",
    ownerName: "",
    ownerNumber: "",
    vaccinated: false,
    sterilized: false,
  });

  const [images, setImages] = useState([]);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setImages(e.target.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length !== 6) {
      setMessage("You must upload exactly 6 images");
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));

    Array.from(images).forEach((image) => data.append("images", image));

    try {
      const response = await axios.post("http://localhost:4000/upload", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage("Post created successfully!");
    } catch (error) {
      setMessage("An error occurred while creating the post");
    }
  };
  return (
    <div>
      {user ? (
        <div>
          <h1>Create Post</h1>
          <form onSubmit={handleSubmit} className="flex flex-col">
            <input type="text" name="title" placeholder="Title" value={formData.title} onChange={handleChange} required />
            <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} required />
            <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleChange} required />
            <input type="text" name="breed" placeholder="Breed" value={formData.breed} onChange={handleChange} required />
            <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleChange} required />
            <input type="text" name="ownerName" placeholder="Owner Name" value={formData.ownerName} onChange={handleChange} required />
            <input type="text" name="ownerNumber" placeholder="Owner Number" value={formData.ownerNumber} onChange={handleChange} required />
            <label>
              Vaccinated
              <input type="checkbox" name="vaccinated" checked={formData.vaccinated} onChange={handleChange} />
            </label>
            <label>
              Sterilized
              <input type="checkbox" name="sterilized" checked={formData.sterilized} onChange={handleChange} />
            </label>
            <input type="file" name="images" multiple onChange={handleFileChange} required accept="image/*" />
            <button type="submit">Create Post</button>
          </form>
          {message && <p>{message}</p>}
        </div>
      ) : (
        <h2>
          <Link href="/">Please Log In</Link>{" "}
        </h2>
      )}
    </div>
  );
}
