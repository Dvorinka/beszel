"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  ExternalLink,
  Globe,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  LayoutTemplate,
  Activity,
  TrendingUp,
  Filter,
  Search,
  Wrench,
  Trash2,
} from "lucide-react"
import {
  getStatusPages,
  deleteStatusPage,
  getStatusPageUrl,
  type StatusPage,
} from "@/lib/statuspages"
import {
  getIncidents,
  createIncident,
  acknowledgeIncident,
  resolveIncident,
  closeIncident,
  getIncidentStats,
  type Incident,
  type CreateIncidentRequest,
  getSeverityColor,
  getStatusColor,
  formatDuration,
} from "@/lib/incidents"
import { StatusPageDialog } from "./status-page-dialog"
import { cn } from "@/lib/utils"

// Quick Stats Card Component
function QuickStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: { value: number; positive: boolean }
  color?: "blue" | "green" | "yellow" | "red" | "purple"
}) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    green: "bg-green-500/10 text-green-600 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    red: "bg-red-500/10 text-red-600 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  }

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg border", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-2",
            trend.positive ? "text-green-600" : "text-red-600"
          )}>
            <TrendingUp className={cn("h-3 w-3", !trend.positive && "rotate-180")} />
            <span>{trend.value}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Incident Quick Actions Menu
function IncidentQuickActions({
  incident,
  onAcknowledge,
  onResolve,
  onClose,
}: {
  incident: Incident
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
  onClose: (id: string) => void
}) {
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [resolution, setResolution] = useState("")

  return (
    <div className="flex items-center gap-2">
      {incident.status === "open" && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
          onClick={() => onAcknowledge(incident.id)}
        >
          <Clock className="mr-1 h-3.5 w-3.5" />
          Ack
        </Button>
      )}
      {(incident.status === "open" || incident.status === "acknowledged") && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => setShowResolveDialog(true)}
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            Resolve
          </Button>
          <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Resolve Incident</DialogTitle>
                <DialogDescription>
                  Add resolution details for this incident.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resolution</label>
                  <Textarea
                    placeholder="How was this incident resolved?"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onResolve(incident.id)
                    setShowResolveDialog(false)
                    setResolution("")
                  }}
                >
                  Resolve Incident
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      {incident.status === "resolved" && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-gray-600 border-gray-200 hover:bg-gray-50"
          onClick={() => onClose(incident.id)}
        >
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Close
        </Button>
      )}
    </div>
  )
}

// Create Incident Dialog
function CreateIncidentDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: CreateIncidentRequest) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState<"critical" | "high" | "medium" | "low">("high")
  const [type, setType] = useState("monitor_down")

  const handleSubmit = () => {
    onCreate({
      title,
      description,
      severity,
      type,
    })
    onOpenChange(false)
    setTitle("")
    setDescription("")
    setSeverity("high")
    setType("monitor_down")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Incident</DialogTitle>
          <DialogDescription>
            Report a new incident or maintenance event.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Incident title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe the incident..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monitor_down">Monitor Down</SelectItem>
                  <SelectItem value="domain_expiring">Domain Expiring</SelectItem>
                  <SelectItem value="ssl_expiring">SSL Expiring</SelectItem>
                  <SelectItem value="system_offline">System Offline</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title}>
            Create Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Status Page Manager Component
export function StatusPageManager() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("overview")
  const [statusPageDialogOpen, setStatusPageDialogOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<StatusPage | null>(null)
  const [createIncidentOpen, setCreateIncidentOpen] = useState(false)
  const [incidentFilter, setIncidentFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch data
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ["status-pages"],
    queryFn: getStatusPages,
  })

  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ["incidents", incidentFilter],
    queryFn: () => getIncidents(incidentFilter === "all" ? {} : { status: incidentFilter }),
  })

  const { data: stats } = useQuery({
    queryKey: ["incident-stats"],
    queryFn: getIncidentStats,
  })

  // Mutations
  const deletePageMutation = useMutation({
    mutationFn: deleteStatusPage,
    onSuccess: () => {
      toast({ title: "Status page deleted" })
      queryClient.invalidateQueries({ queryKey: ["status-pages"] })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" })
    },
  })

  const createIncidentMutation = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      toast({ title: "Incident created" })
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
      queryClient.invalidateQueries({ queryKey: ["incident-stats"] })
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create incident", description: error.message, variant: "destructive" })
    },
  })

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeIncident,
    onSuccess: () => {
      toast({ title: "Incident acknowledged" })
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveIncident(id),
    onSuccess: () => {
      toast({ title: "Incident resolved" })
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
      queryClient.invalidateQueries({ queryKey: ["incident-stats"] })
    },
  })

  const closeMutation = useMutation({
    mutationFn: closeIncident,
    onSuccess: () => {
      toast({ title: "Incident closed" })
      queryClient.invalidateQueries({ queryKey: ["incidents"] })
      queryClient.invalidateQueries({ queryKey: ["incident-stats"] })
    },
  })

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    if (!incidents) return []
    if (!searchQuery) return incidents
    return incidents.filter(
      (i) =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [incidents, searchQuery])

  // Active incidents count
  const activeIncidents = useMemo(
    () => incidents?.filter((i) => i.status === "open" || i.status === "acknowledged").length || 0,
    [incidents]
  )

  const handleEdit = (page: StatusPage) => {
    setEditingPage(page)
    setStatusPageDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingPage(null)
    setStatusPageDialogOpen(true)
  }

  const handleDelete = (page: StatusPage) => {
    if (confirm(`Delete "${page.name}"? This will unlink all ${page.monitor_count} monitor(s).`)) {
      deletePageMutation.mutate(page.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Status Page Manager</h1>
          <p className="text-muted-foreground">
            Manage status pages, incidents, and public communications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreateIncidentOpen(true)}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            New Incident
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            New Status Page
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Status Pages"
          value={pages?.length || 0}
          subtitle={`${pages?.filter((p) => p.public).length || 0} public`}
          icon={LayoutTemplate}
          color="blue"
        />
        <QuickStatCard
          title="Active Incidents"
          value={activeIncidents}
          subtitle={`${incidents?.filter((i) => i.severity === "critical").length || 0} critical`}
          icon={AlertTriangle}
          color={activeIncidents > 0 ? "red" : "green"}
        />
        <QuickStatCard
          title="Total Monitors"
          value={pages?.reduce((acc, p) => acc + p.monitor_count, 0) || 0}
          subtitle="Across all pages"
          icon={Activity}
          color="purple"
        />
        <QuickStatCard
          title="MTTR (Hours)"
          value={stats?.mttr_hours?.toFixed(1) || "-"}
          subtitle="Mean time to resolution"
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">
            Status Pages
            {pages && pages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incidents">
            Incidents
            {activeIncidents > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeIncidents}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Status Pages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5" />
                  Recent Status Pages
                </CardTitle>
                <CardDescription>
                  Your public and private status pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pagesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : pages?.length === 0 ? (
                  <div className="text-center py-8">
                    <LayoutTemplate className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No status pages yet</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleAdd}>
                      Create one
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pages?.slice(0, 5).map((page) => (
                      <div
                        key={page.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {page.public ? (
                            <Globe className="h-4 w-4 text-green-500" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{page.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {page.monitor_count} monitors
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {page.public && (
                            <a
                              href={getStatusPageUrl(page.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(page)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Incidents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Incidents
                </CardTitle>
                <CardDescription>
                  Incidents requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {incidentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredIncidents.filter((i) => i.status !== "closed").length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All clear! No active incidents.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredIncidents
                      .filter((i) => i.status !== "closed")
                      .slice(0, 5)
                      .map((incident) => (
                        <div
                          key={incident.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={getSeverityColor(incident.severity)}>
                              {incident.severity}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">{incident.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDuration(incident.started_at)}
                              </p>
                            </div>
                          </div>
                          <IncidentQuickActions
                            incident={incident}
                            onAcknowledge={acknowledgeMutation.mutate}
                            onResolve={resolveMutation.mutate}
                            onClose={closeMutation.mutate}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Status Pages Tab */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>All Status Pages</CardTitle>
              <CardDescription>
                Manage your public and private status pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pagesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Monitors</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages?.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.name}</TableCell>
                        <TableCell>{page.slug}</TableCell>
                        <TableCell>{page.monitor_count}</TableCell>
                        <TableCell>
                          {page.public ? (
                            <Badge variant="default" className="bg-green-500">
                              <Globe className="mr-1 h-3 w-3" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Lock className="mr-1 h-3 w-3" />
                              Private
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(page.updated).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {page.public && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                              >
                                <a
                                  href={getStatusPageUrl(page.slug)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(page)}
                            >
                              <Wrench className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDelete(page)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>All Incidents</CardTitle>
                  <CardDescription>
                    Manage and track all incidents
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search incidents..."
                      className="pl-8 w-[200px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={incidentFilter} onValueChange={setIncidentFilter}>
                    <SelectTrigger className="w-[130px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {incidentsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">No incidents found</p>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search or filters"
                      : "All systems are running smoothly"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="w-[250px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium max-w-[300px] truncate">
                          {incident.title}
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(incident.status)}
                          >
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDuration(incident.started_at)}</TableCell>
                        <TableCell>
                          {new Date(incident.started_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IncidentQuickActions
                            incident={incident}
                            onAcknowledge={acknowledgeMutation.mutate}
                            onResolve={resolveMutation.mutate}
                            onClose={closeMutation.mutate}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <StatusPageDialog
        open={statusPageDialogOpen}
        onOpenChange={setStatusPageDialogOpen}
        page={editingPage}
        isEdit={!!editingPage}
      />

      <CreateIncidentDialog
        open={createIncidentOpen}
        onOpenChange={setCreateIncidentOpen}
        onCreate={createIncidentMutation.mutate}
      />
    </div>
  )
}
