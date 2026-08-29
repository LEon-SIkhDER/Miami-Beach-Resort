
import { useEffect, useState } from "react";

const CategoryAndPricing = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        category: "",
        price: "",
        description: "",
    });

    const getCategories = async () => {
        try {
            setLoading(true);

            const res = await fetch("http://localhost:5000/categoryandpricing");
            const data = await res.json();

            setCategories(data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch(
                "http://localhost:5000/categoryandpricing",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        category: formData.category,
                        price: Number(formData.price),
                        description: formData.description,
                    }),
                }
            );

            const data = await res.json();

            if (res.ok) {
                setCategories([...categories, data]);

                setFormData({
                    category: "",
                    price: "",
                    description: "",
                });
            }
        } catch (error) {
            console.log(error);
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetch(
                `http://localhost:5000/categoryandpricing/${id}`,
                {
                    method: "DELETE",
                }
            );

            if (res.ok) {
                setCategories(
                    categories.filter((category) => category._id !== id)
                );
            }
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="w-full p-6">

            {/* Add Category */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-semibold text-gray-800">
                    Add Category & Pricing
                </h2>

                <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                    {/* Category */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Category
                        </label>

                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            placeholder="Enter category"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Price
                        </label>

                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            placeholder="Enter price"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Description
                        </label>

                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter description"
                            rows="4"
                            required
                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
                        ></textarea>
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition hover:bg-blue-700"
                        >
                            Add Category
                        </button>
                    </div>
                </form>
            </div>

            {/* Categories */}
            <div>
                <h2 className="mb-5 text-xl font-semibold text-gray-800">
                    Categories
                </h2>

                {loading ? (
                    <div className="py-10 text-center text-gray-500">
                        Loading...
                    </div>
                ) : categories.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-gray-500">
                        No category found
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {categories.map((item) => (
                            <div
                                key={item._id}
                                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                            >
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        {item.category}
                                    </h3>

                                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                                        ৳ {item.price}
                                    </span>
                                </div>

                                <p className="text-sm leading-6 text-gray-600">
                                    {item.description}
                                </p>

                                <button
                                    onClick={() => handleDelete(item._id)}
                                    className="mt-5 text-sm font-medium text-red-500 hover:text-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryAndPricing;

