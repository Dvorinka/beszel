import { Trans, useLingui } from "@lingui/react/macro"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
	createMonitor,
	updateMonitor,
	type Monitor,
	type MonitorType,
	type CreateMonitorRequest,
	type UpdateMonitorRequest,
} from "@/lib/monitors"

const MONITOR_TYPES: { value: MonitorType; label: string }[] = [
	{ value: "http", label: "HTTP" },
	{ value: "https", label: "HTTPS" },
	{ value: "tcp", label: "TCP Port" },
	{ value: "ping", label: "Ping" },
	{ value: "dns", label: "DNS" },
	{ value: "keyword", label: "HTTP Keyword" },
	{ value: "json-query", label: "HTTP JSON" },
	{ value: "docker", label: "Docker Container" },
]

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"]

const DNS_RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SRV"]

interface AddMonitorDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	monitor?: Monitor | null
	isEdit?: boolean
}

export function AddMonitorDialog({
	open,
	onOpenChange,
	monitor,
	isEdit = false,
}: AddMonitorDialogProps) {
	const { t } = useLingui()
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [activeTab, setActiveTab] = useState("basic")

	// Form state
	const [name, setName] = useState("")
	const [type, setType] = useState<MonitorType>("https")
	const [url, setUrl] = useState("")
	const [hostname, setHostname] = useState("")
	const [port, setPort] = useState<number | "">("")
	const [method, setMethod] = useState("GET")
	const [headers, setHeaders] = useState("")
	const [body, setBody] = useState("")
	const [interval, setInterval] = useState(60)
	const [timeout, setTimeout] = useState(30)
	const [retries, setRetries] = useState(1)
	const [keyword, setKeyword] = useState("")
	const [jsonQuery, setJsonQuery] = useState("")
	const [expectedValue, setExpectedValue] = useState("")
	const [invertKeyword, setInvertKeyword] = useState(false)
	const [dnsResolveServer, setDnsResolveServer] = useState("")
	const [dnsResolverMode, setDnsResolverMode] = useState("A")
	const [description, setDescription] = useState("")
	const [ignoreTLSError, setIgnoreTLSError] = useState(false)
	const [certExpiryNotification, setCertExpiryNotification] = useState(false)
	const [certExpiryDays, setCertExpiryDays] = useState(14)

	// Reset form when dialog opens/closes
	useEffect(() => {
		if (open) {
			if (isEdit && monitor) {
				// Populate form for editing
				setName(monitor.name)
				setType(monitor.type)
				setUrl(monitor.url || "")
				setHostname(monitor.hostname || "")
				setPort(monitor.port || "")
				setMethod(monitor.method || "GET")
				setHeaders("") // Parse from JSON if needed
				setBody("")
				setInterval(monitor.interval || 60)
				setTimeout(monitor.timeout || 30)
				setRetries(monitor.retries || 1)
				setKeyword(monitor.keyword || "")
				setJsonQuery(monitor.json_query || "")
				setExpectedValue(monitor.expected_value || "")
				setInvertKeyword(monitor.invert_keyword || false)
				setDnsResolveServer(monitor.dns_resolve_server || "")
				setDnsResolverMode(monitor.dns_resolver_mode || "A")
				setDescription(monitor.description || "")
				setIgnoreTLSError(monitor.ignore_tls_error || false)
				setCertExpiryNotification(monitor.cert_expiry_notification || false)
				setCertExpiryDays(monitor.cert_expiry_days || 14)
			} else {
				// Reset to defaults for new monitor
				setName("")
				setType("https")
				setUrl("")
				setHostname("")
				setPort("")
				setMethod("GET")
				setHeaders("")
				setBody("")
				setInterval(60)
				setTimeout(30)
				setRetries(1)
				setKeyword("")
				setJsonQuery("")
				setExpectedValue("")
				setInvertKeyword(false)
				setDnsResolveServer("")
				setDnsResolverMode("A")
				setDescription("")
				setIgnoreTLSError(false)
				setCertExpiryNotification(false)
				setCertExpiryDays(14)
			}
			setActiveTab("basic")
		}
	}, [open, isEdit, monitor])

	const createMutation = useMutation({
		mutationFn: createMonitor,
		onSuccess: () => {
			toast({ title: t`Monitor created successfully` })
			queryClient.invalidateQueries({ queryKey: ["monitors"] })
			onOpenChange(false)
		},
		onError: (error) => {
			toast({
				title: t`Failed to create monitor`,
				description: error instanceof Error ? error.message : "Unknown error",
				variant: "destructive",
			})
		},
	})

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateMonitorRequest }) =>
			updateMonitor(id, data),
		onSuccess: () => {
			toast({ title: t`Monitor updated successfully` })
			queryClient.invalidateQueries({ queryKey: ["monitors"] })
			onOpenChange(false)
		},
		onError: (error) => {
			toast({
				title: t`Failed to update monitor`,
				description: error instanceof Error ? error.message : "Unknown error",
				variant: "destructive",
			})
		},
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!name.trim()) {
			toast({ title: t`Name is required`, variant: "destructive" })
			return
		}

		if (isEdit && monitor) {
			const data: UpdateMonitorRequest = {
				name: name.trim(),
				url: url.trim() || undefined,
				hostname: hostname.trim() || undefined,
				port: port ? Number(port) : undefined,
				method: ["http", "https", "keyword", "json-query"].includes(type)
					? method
					: undefined,
				headers: headers.trim() || undefined,
				body: body.trim() || undefined,
				interval,
				timeout,
				retries,
				keyword: type === "keyword" ? keyword.trim() : undefined,
				json_query: type === "json-query" ? jsonQuery.trim() : undefined,
				expected_value: type === "json-query" ? expectedValue.trim() : undefined,
				invert_keyword: type === "keyword" ? invertKeyword : undefined,
				dns_resolve_server: type === "dns" ? dnsResolveServer.trim() : undefined,
				dns_resolver_mode: type === "dns" ? dnsResolverMode : undefined,
				description: description.trim() || undefined,
				ignore_tls_error:
					type === "https" || type === "keyword" || type === "json-query"
						? ignoreTLSError
						: undefined,
				cert_expiry_notification: type === "https" ? certExpiryNotification : undefined,
				cert_expiry_days: type === "https" ? certExpiryDays : undefined,
			}
			updateMutation.mutate({ id: monitor.id, data })
		} else {
			const data: CreateMonitorRequest = {
				name: name.trim(),
				type,
				url: url.trim() || undefined,
				hostname: hostname.trim() || undefined,
				port: port ? Number(port) : undefined,
				method: ["http", "https", "keyword", "json-query"].includes(type)
					? method
					: undefined,
				headers: headers.trim() || undefined,
				body: body.trim() || undefined,
				interval,
				timeout,
				retries,
				keyword: type === "keyword" ? keyword.trim() : undefined,
				json_query: type === "json-query" ? jsonQuery.trim() : undefined,
				expected_value: type === "json-query" ? expectedValue.trim() : undefined,
				invert_keyword: type === "keyword" ? invertKeyword : undefined,
				dns_resolve_server: type === "dns" ? dnsResolveServer.trim() : undefined,
				dns_resolver_mode: type === "dns" ? dnsResolverMode : undefined,
				description: description.trim() || undefined,
				ignore_tls_error:
					type === "https" || type === "keyword" || type === "json-query"
						? ignoreTLSError
						: undefined,
				cert_expiry_notification: type === "https" ? certExpiryNotification : undefined,
				cert_expiry_days: type === "https" ? certExpiryDays : undefined,
			}
			createMutation.mutate(data)
		}
	}

	const needsUrl = ["http", "https", "keyword", "json-query"].includes(type)
	const needsHostname = ["tcp", "ping", "dns"].includes(type)
	const needsPort = type === "tcp"
	const needsHttpOptions = ["http", "https", "keyword", "json-query"].includes(type)
	const needsKeyword = type === "keyword"
	const needsJsonQuery = type === "json-query"
	const needsDnsOptions = type === "dns"
	const needsTlsOptions = type === "https"

	const isPending = createMutation.isPending || updateMutation.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? <Trans>Edit Monitor</Trans> : <Trans>Add Monitor</Trans>}
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Configure a monitor to track website or service availability.
						</Trans>
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="basic">
								<Trans>Basic</Trans>
							</TabsTrigger>
							<TabsTrigger value="advanced">
								<Trans>Advanced</Trans>
							</TabsTrigger>
							<TabsTrigger value="notifications">
								<Trans>Notifications</Trans>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="basic" className="space-y-4 mt-4">
							<div className="grid gap-4">
								<div className="grid gap-2">
									<Label htmlFor="name">
										<Trans>Monitor Name</Trans> *
									</Label>
									<Input
										id="name"
										placeholder={t`e.g., My Website`}
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
									/>
								</div>

								<div className="grid gap-2">
									<Label htmlFor="type">
										<Trans>Monitor Type</Trans> *
									</Label>
									<Select
										value={type}
										onValueChange={(v) => setType(v as MonitorType)}
									>
										<SelectTrigger id="type">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MONITOR_TYPES.map((mt) => (
												<SelectItem key={mt.value} value={mt.value}>
													{mt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{needsUrl && (
									<div className="grid gap-2">
										<Label htmlFor="url">
											<Trans>URL</Trans> *
										</Label>
										<Input
											id="url"
											placeholder={t`https://example.com`}
											value={url}
											onChange={(e) => setUrl(e.target.value)}
											required
										/>
									</div>
								)}

								{needsHostname && (
									<div className="grid gap-2">
										<Label htmlFor="hostname">
											<Trans>Hostname</Trans> *
										</Label>
										<Input
											id="hostname"
											placeholder={t`example.com`}
											value={hostname}
											onChange={(e) => setHostname(e.target.value)}
											required
										/>
									</div>
								)}

								{needsPort && (
									<div className="grid gap-2">
										<Label htmlFor="port">
											<Trans>Port</Trans> *
										</Label>
										<Input
											id="port"
											type="number"
											placeholder={t`443`}
											value={port}
											onChange={(e) =>
												setPort(
													e.target.value ? Number(e.target.value) : ""
												)
											}
											required
										/>
									</div>
								)}

								{needsHttpOptions && (
									<div className="grid gap-2">
										<Label htmlFor="method">
											<Trans>HTTP Method</Trans>
										</Label>
										<Select value={method} onValueChange={setMethod}>
											<SelectTrigger id="method">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{HTTP_METHODS.map((m) => (
													<SelectItem key={m} value={m}>
														{m}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{needsKeyword && (
									<div className="grid gap-2">
										<Label htmlFor="keyword">
											<Trans>Keyword to Search</Trans> *
										</Label>
										<Input
											id="keyword"
											placeholder={t`Success`}
											value={keyword}
											onChange={(e) => setKeyword(e.target.value)}
											required
										/>
										<div className="flex items-center gap-2 mt-2">
											<Switch
												id="invertKeyword"
												checked={invertKeyword}
												onCheckedChange={setInvertKeyword}
											/>
											<Label htmlFor="invertKeyword">
												<Trans>Invert match (alert if keyword found)</Trans>
											</Label>
										</div>
									</div>
								)}

								{needsJsonQuery && (
									<div className="space-y-4">
										<div className="grid gap-2">
											<Label htmlFor="jsonQuery">
												<Trans>JSON Path</Trans> *
											</Label>
											<Input
												id="jsonQuery"
												placeholder={t`data.status`}
												value={jsonQuery}
												onChange={(e) => setJsonQuery(e.target.value)}
												required
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="expectedValue">
												<Trans>Expected Value</Trans>
											</Label>
											<Input
												id="expectedValue"
												placeholder={t`active`}
												value={expectedValue}
												onChange={(e) => setExpectedValue(e.target.value)}
											/>
										</div>
									</div>
								)}

								{needsDnsOptions && (
									<div className="space-y-4">
										<div className="grid gap-2">
											<Label htmlFor="dnsResolverMode">
												<Trans>Record Type</Trans>
											</Label>
											<Select
												value={dnsResolverMode}
												onValueChange={setDnsResolverMode}
											>
												<SelectTrigger id="dnsResolverMode">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{DNS_RECORD_TYPES.map((t) => (
														<SelectItem key={t} value={t}>
															{t}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="dnsResolveServer">
												<Trans>DNS Server (optional)</Trans>
											</Label>
											<Input
												id="dnsResolveServer"
												placeholder={t`8.8.8.8`}
												value={dnsResolveServer}
												onChange={(e) => setDnsResolveServer(e.target.value)}
											/>
										</div>
									</div>
								)}

								<div className="grid gap-2">
									<Label htmlFor="description">
										<Trans>Description</Trans>
									</Label>
									<Textarea
										id="description"
										placeholder={t`Optional description for this monitor`}
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										rows={2}
									/>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="advanced" className="space-y-4 mt-4">
							<div className="grid grid-cols-3 gap-4">
								<div className="grid gap-2">
									<Label htmlFor="interval">
										<Trans>Interval (seconds)</Trans>
									</Label>
									<Input
										id="interval"
										type="number"
										min={20}
										max={86400}
										value={interval}
										onChange={(e) => setInterval(Number(e.target.value))}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="timeout">
										<Trans>Timeout (seconds)</Trans>
									</Label>
									<Input
										id="timeout"
										type="number"
										min={1}
										max={300}
										value={timeout}
										onChange={(e) => setTimeout(Number(e.target.value))}
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="retries">
										<Trans>Retries</Trans>
									</Label>
									<Input
										id="retries"
										type="number"
										min={0}
										max={10}
										value={retries}
										onChange={(e) => setRetries(Number(e.target.value))}
									/>
								</div>
							</div>

							{needsHttpOptions && (
								<div className="space-y-4">
									<div className="grid gap-2">
										<Label htmlFor="headers">
											<Trans>Headers (JSON)</Trans>
										</Label>
										<Textarea
											id="headers"
											placeholder={`{\n  "Authorization": "Bearer token"\n}`}
											value={headers}
											onChange={(e) => setHeaders(e.target.value)}
											rows={3}
										/>
									</div>
									<div className="grid gap-2">
										<Label htmlFor="body">
											<Trans>Body</Trans>
										</Label>
										<Textarea
											id="body"
											placeholder={t`Request body for POST/PUT requests`}
											value={body}
											onChange={(e) => setBody(e.target.value)}
											rows={3}
										/>
									</div>
								</div>
							)}

							{needsTlsOptions && (
								<div className="space-y-4 border rounded-lg p-4">
									<div className="flex items-center gap-2">
										<Switch
											id="ignoreTLSError"
											checked={ignoreTLSError}
											onCheckedChange={setIgnoreTLSError}
										/>
										<Label htmlFor="ignoreTLSError">
											<Trans>Ignore TLS/SSL errors</Trans>
										</Label>
									</div>
								</div>
							)}
						</TabsContent>

						<TabsContent value="notifications" className="space-y-4 mt-4">
							{needsTlsOptions && (
								<div className="space-y-4 border rounded-lg p-4">
									<div className="flex items-center gap-2">
										<Switch
											id="certExpiryNotification"
											checked={certExpiryNotification}
											onCheckedChange={setCertExpiryNotification}
										/>
										<Label htmlFor="certExpiryNotification">
											<Trans>Notify when certificate expires</Trans>
										</Label>
									</div>
									{certExpiryNotification && (
										<div className="grid gap-2 mt-2">
											<Label htmlFor="certExpiryDays">
												<Trans>Days before expiry to notify</Trans>
											</Label>
											<Input
												id="certExpiryDays"
												type="number"
												min={1}
												max={90}
												value={certExpiryDays}
												onChange={(e) =>
													setCertExpiryDays(Number(e.target.value))
												}
											/>
										</div>
									)}
								</div>
							)}

							{!needsTlsOptions && (
								<p className="text-muted-foreground text-sm">
									<Trans>
										Certificate expiry notifications are only available
										for HTTPS monitors.
									</Trans>
								</p>
							)}

							<div className="border rounded-lg p-4">
								<p className="text-sm text-muted-foreground">
									<Trans>
										General notification settings will be configured in
										the Notifications tab.
									</Trans>
								</p>
							</div>
						</TabsContent>
					</Tabs>

					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<Trans>Saving...</Trans>
							) : isEdit ? (
								<Trans>Update Monitor</Trans>
							) : (
								<Trans>Create Monitor</Trans>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
