import axios from 'axios';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import React, { useRef } from 'react';
import toast from 'react-hot-toast';
import AddCategory from './AddCategory';
import { useQuery } from '@tanstack/react-query'
import EditCategory from './EditCategory';
import DeleteCategory from './DeleteCategory';

const CategoryAndPricing = () => {

    const { data: categories, refetch } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const { data: result } = await axios.get("http://localhost:5000/categoryandpricing")
            return result
        }
    })
    console.log(categories);

    return (
        <div>
            <div className='flex justify-between'>
                <div>
                    <h1>Category and pricing</h1>
                    <p>All category here</p>
                </div>
                <AddCategory className='btn btn-primary' refetch={refetch}><Plus />Add Category</AddCategory>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
                {categories?.map((category) => (
                    <div
                        key={category._id}
                        className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                        {/* Content */}
                        <div className="flex-1 p-5">
                            <div className="mb-3">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {category.name.trim()}
                                </h3>
                            </div>

                            <p className="text-sm text-gray-500 leading-6">
                                {category.description}
                            </p>
                        </div>

                        {/* Bottom */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                            {/* Price */}
                            <div>
                                <span className="text-xl font-bold text-[#009689]">
                                    ৳{category.price}
                                </span>
                                <span className="text-xs text-gray-400 ml-1">
                                    / night
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {/* View */}
                                <button
                                    type="button"
                                    title="View"
                                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#009689] text-[#009689] hover:bg-[#009689] hover:text-white transition"
                                >
                                    <Eye size={18} />
                                </button>

                                {/* Edit */}
                                <EditCategory
                                    // type="button"
                                    // title="Edit"
                                    category={category}
                                    refetch={refetch}
                                    className="w-10 cursor-pointer h-10 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                                >
                                    <Pencil size={18} />
                                </EditCategory>

                                {/* Delete */}
                                <DeleteCategory
                                    refetch={refetch}
                                    category={category}
                                    
                                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition"
                                >
                                    <Trash2 size={18} />
                                </DeleteCategory>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default CategoryAndPricing;