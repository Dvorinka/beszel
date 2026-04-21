"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	createDomain,
	updateDomain,
	lookupDomain,
	cleanDomain,
	type Domain,
	type CreateDomainRequest,
	type UpdateDomainRequest,
	type DomainLookupResult,
} from "@/lib/domains"
import { Loader2, Search } from "lucide-react"

const formSchema = z.object({
	domain_name: z.string().min(1, "Domain name is required"),
	tags: z.string().optional(),
	notes: z.string().optional(),
	purchase_price: z.coerce.number().min(0).optional(),
	current_value: z.coerce.number().min(0).optional(),
	renewal_cost: z.coerce.number().min(0).optional(),
	auto_renew: z.boolean(),
	alert_days_before: z.coerce.number().min(1).max(365),
	ssl_alert_enabled: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface DomainDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	domain?: Domain | null
	isEdit?: boolean
}

export function DomainDialog({ open, onOpenChange, domain, isEdit = false }: DomainDialogProps) {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [activeTab, setActiveTab] = useState("basic")
	const [lookupData, setLookupData] = useState<DomainLookupResult | null>(null)
	const [isLookingUp, setIsLookingUp] = useState(false)

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			domain_name: "",
			tags: "",
			notes: "",
			purchase_price: 0,
			current_value: 0,
			renewal_cost: 0,
			auto_renew: false,
			alert_days_before: 30,
			ssl_alert_enabled: true,
		},
	})

	useEffect(() => {
		if (open && isEdit && domain) {
			form.reset({
				domain_name: domain.domain_name,
				tags: domain.tags?.join(", ") || "",
				notes: domain.notes || "",
				purchase_price: domain.purchase_price || 0,
				current_value: domain.current_value || 0,
				renewal_cost: domain.renewal_cost || 0,
				auto_renew: domain.auto_renew || false,
				alert_days_before: domain.alert_days_before || 30,
				ssl_alert_enabled: domain.ssl_alert_enabled || true,
			})
		} else if (open && !isEdit) {
			form.reset({
				domain_name: "",
				tags: "",
				notes: "",
				purchase_price: 0,
				current_value: 0,
				renewal_cost: 0,
				auto_renew: false,
				alert_days_before: 30,
				ssl_alert_enabled: true,
			})
			setLookupData(null)
		}
	}, [open, isEdit, domain, form])

	const createMutation = useMutation({
		mutationFn: createDomain,
		onSuccess: () => {
			toast({ title: "Domain added successfully" })
			queryClient.invalidateQueries({ queryKey: ["domains"] })
			onOpenChange(false)
		},
		onError: (error: Error) => {
			toast({
				title: "Failed to add domain",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateDomainRequest }) =>
			updateDomain(id, data),
		onSuccess: () => {
			toast({ title: "Domain updated successfully" })
			queryClient.invalidateQueries({ queryKey: ["domains"] })
			onOpenChange(false)
		},
		onError: (error: Error) => {
			toast({
				title: "Failed to update domain",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const handleLookup = async () => {
		const domainName = form.getValues("domain_name")
		if (!domainName) return

		setIsLookingUp(true)
		try {
			const data = await lookupDomain(domainName)
			setLookupData(data)
			toast({ title: "Domain info retrieved successfully" })
		} catch (error) {
			toast({
				title: "Failed to lookup domain",
				description: error instanceof Error ? error.message : "Unknown error",
				variant: "destructive",
			})
		} finally {
			setIsLookingUp(false)
		}
	}

	const onSubmit = (data: FormData) => {
		const payload: CreateDomainRequest = {
			domain_name: cleanDomain(data.domain_name),
			auto_lookup: !isEdit && lookupData !== null,
			tags: data.tags?.split(",").map((t) => t.trim()).filter(Boolean),
			notes: data.notes,
			purchase_price: data.purchase_price,
			current_value: data.current_value,
			renewal_cost: data.renewal_cost,
			auto_renew: data.auto_renew,
			alert_days_before: data.alert_days_before,
			ssl_alert_enabled: data.ssl_alert_enabled,
		}

		if (isEdit && domain) {
			updateMutation.mutate({
				id: domain.id,
				data: {
					tags: payload.tags,
					notes: payload.notes,
					purchase_price: payload.purchase_price,
					current_value: payload.current_value,
					renewal_cost: payload.renewal_cost,
					auto_renew: payload.auto_renew,
					alert_days_before: payload.alert_days_before,
					ssl_alert_enabled: payload.ssl_alert_enabled,
				},
			})
		} else {
			createMutation.mutate(payload)
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Domain" : "Add Domain"}
					</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update domain tracking settings."
							: "Add a domain to track its expiry, SSL, and DNS information."}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<Tabs value={activeTab} onValueChange={setActiveTab}>
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="basic">Basic</TabsTrigger>
								<TabsTrigger value="valuation">Valuation</TabsTrigger>
								<TabsTrigger value="alerts">Alerts</TabsTrigger>
							</TabsList>

							<TabsContent value="basic" className="space-y-4 mt-4">
								{!isEdit && (
								<div className="flex gap-2 items-end">
									<FormField
										control={form.control}
										name="domain_name"
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormLabel>Domain Name</FormLabel>
												<FormControl>
													<Input placeholder="example.com" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button
										type="button"
										variant="outline"
										onClick={handleLookup}
										disabled={isLookingUp || !form.getValues("domain_name")}
										className="shrink-0"
									>
										{isLookingUp ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<>
												<Search className="h-4 w-4 mr-2" />
												<span>Lookup</span>
											</>
										)}
									</Button>
								</div>
							)}

								{isEdit && (
									<FormField
										control={form.control}
										name="domain_name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Domain Name</FormLabel>
												<FormControl>
													<Input disabled {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
								)}

								<FormField
									control={form.control}
									name="tags"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tags (comma separated)</FormLabel>
											<FormControl>
												<Input placeholder="portfolio, client, investment" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="notes"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Notes</FormLabel>
											<FormControl>
												<Input placeholder="Any additional information..." {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{lookupData && !isEdit && (
									<div className="rounded-lg border p-4 space-y-2">
										<h4 className="font-medium">Lookup Results</h4>
										{lookupData.registrar_name && (
											<p className="text-sm">Registrar: {lookupData.registrar_name}</p>
										)}
										{lookupData.expiry_date && (
											<p className="text-sm">Expires: {lookupData.expiry_date}</p>
										)}
										{lookupData.ssl_valid_to && (
											<p className="text-sm">SSL Expires: {lookupData.ssl_valid_to}</p>
										)}
										{lookupData.host_country && (
											<p className="text-sm">Location: {lookupData.host_country}</p>
										)}
									</div>
								)}
							</TabsContent>

							<TabsContent value="valuation" className="space-y-4 mt-4">
								<FormField
									control={form.control}
									name="purchase_price"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Purchase Price</FormLabel>
											<FormControl>
												<Input type="number" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="current_value"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Current Value</FormLabel>
											<FormControl>
												<Input type="number" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="renewal_cost"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Renewal Cost</FormLabel>
											<FormControl>
												<Input type="number" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="auto_renew"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>Auto Renew</FormLabel>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</TabsContent>

							<TabsContent value="alerts" className="space-y-4 mt-4">
								<FormField
									control={form.control}
									name="alert_days_before"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Alert Days Before Expiry</FormLabel>
											<FormControl>
												<Input type="number" min={1} max={365} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="ssl_alert_enabled"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-3">
											<div className="space-y-0.5">
												<FormLabel>SSL Expiry Alerts</FormLabel>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</TabsContent>
						</Tabs>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : isEdit ? "Update" : "Add Domain"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
