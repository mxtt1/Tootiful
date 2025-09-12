import React, { useEffect, useState } from "react";
import API from "../api/apiClient"; // your backend service

import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Button,
    TextField,
    Select,
    MenuItem,
    IconButton,
    CircularProgress,
} from "@mui/material";

import { Edit, Delete } from "@mui/icons-material";

export default function UserManagement() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const offset = (page - 1) * limit;

                // Fix 1: Change from /users to /students (matches your backend)
                // Fix 2: Build query params properly
                const params = new URLSearchParams({
                    limit: limit.toString(),
                    offset: offset.toString(),
                    ...(search && { search }),
                    ...(roleFilter && { role: roleFilter }),
                    ...(statusFilter && { active: statusFilter === 'Active' ? 'true' : 'false' })
                });

                const res = await API.get(`/students?${params.toString()}`);

                // Fix 3: Handle your backend response structure and map fields
                const users = res.rows || res.data || res || [];
                const mappedUsers = users.map(user => ({
                    id: user.id,
                    fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
                    email: user.email,
                    username: user.username,
                    status: user.isActive ? 'Active' : 'Inactive',
                    role: user.role || 'Student',
                    joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
                }));

                setRows(mappedUsers);
            } catch (err) {
                console.error('Fetch error:', err);
                setError("Failed to load users");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [page, limit, search, roleFilter, statusFilter]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h2 className="text-2xl font-bold mb-4">User Management</h2>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <TextField
                    label="Search"
                    variant="outlined"
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    displayEmpty
                    size="small"
                >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                    <MenuItem value="User">User</MenuItem>
                    <MenuItem value="Moderator">Moderator</MenuItem>
                    <MenuItem value="Guest">Guest</MenuItem>
                </Select>
                <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    displayEmpty
                    size="small"
                >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                    <MenuItem value="Suspended">Suspended</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Banned">Banned</MenuItem>
                </Select>
                <Button variant="contained" onClick={() => setPage(1)}>
                    Apply
                </Button>
            </div>

            {/* Table */}
            {loading ? (
                <CircularProgress />
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Full Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Username</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Joined Date</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.fullName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>
                                    <span
                                        className={`px-2 py-1 rounded text-white ${user.status === "Active"
                                            ? "bg-green-500"
                                            : user.status === "Inactive"
                                                ? "bg-gray-500"
                                                : user.status === "Suspended"
                                                    ? "bg-orange-500"
                                                    : user.status === "Pending"
                                                        ? "bg-blue-500"
                                                        : "bg-red-500"
                                            }`}
                                    >
                                        {user.status}
                                    </span>
                                </TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>{user.joinedDate}</TableCell>
                                <TableCell>
                                    <IconButton size="small" color="primary">
                                        <Edit />
                                    </IconButton>
                                    <IconButton size="small" color="error">
                                        <Delete />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Pagination */}
            <div className="flex justify-center mt-4 gap-2">
                <Button
                    disabled={page === 1}
                    onClick={() => setPage((prev) => prev - 1)}
                >
                    Prev
                </Button>
                <span className="px-2">Page {page}</span>
                <Button onClick={() => setPage((prev) => prev + 1)}>Next</Button>
            </div>
        </div>
    );
}