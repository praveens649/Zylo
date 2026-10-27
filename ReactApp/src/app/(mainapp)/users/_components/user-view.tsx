"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { User } from "@/api/users.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GenericTable from "@/components/ui/generic-table";

import { useAuthUser } from "@/lib/use-auth-user";
import { isAdmin } from "@/lib/permissions";
import { ForbiddenState } from "../../_components/forbidden-state";
import { useUsers } from "../_hooks/use-users";
import { UserDetailsSheet } from "./user-details-sheet";

export function UsersView() {
  const [viewUser, setViewUser] = useState<User | null>(null);

  const { user: currentUser } = useAuthUser();
  const admin = isAdmin(currentUser);

  const { data, isPending, error, refetch } = useUsers();
  const users = Array.isArray(data?.data)
    ? data.data
    : (data?.data as unknown as { users?: User[] })?.users ?? [];

  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-3 py-1">
            {row.original.image ? (

              <img
                src={row.original.image}
                alt={row.original.name}
                className="h-8 w-8 shrink-0 rounded-full border border-primary/20 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-xs text-foreground">
                {row.original.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{row.original.role}</span>
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={
              row.original.isActive
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                : "bg-muted text-muted-foreground border-border/40 text-xs"
            }
          >
            {row.original.isActive ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "mustChangePassword",
        header: "Password Reset",
        cell: ({ row }) =>
          row.original.mustChangePassword ? (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-xs">
              <KeyRound className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Normal</span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setViewUser(row.original)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View details
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  if (currentUser && !admin) {
    return (
      <ForbiddenState message="Administrator access is required to view users." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered accounts — assign roles, review access, and deactivate users.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading users…
        </div>
      )}

      {/* Error */}
      {error && !isPending && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error instanceof Error ? error.message : "Failed to load users."}
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      {!isPending && !error && (
        <GenericTable
          columns={columns}
          data={users}
          sort
          filter
          filterColumn="name"
          filterPlaceHolder="Search users "
          pagination
        />
      )}

      {/* View details sheet */}
      <UserDetailsSheet user={viewUser} onClose={() => setViewUser(null)} />
    </div>
  );
}

export default UsersView;
