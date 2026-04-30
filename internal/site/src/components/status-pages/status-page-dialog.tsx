"use client"

import { useState, useEffect, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

// Generate slug from name
const generateSlug = (name: string): string => {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 50)
}
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
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	createStatusPage,
	updateStatusPage,
	getStatusPageUrl,
	type StatusPage,
} from "@/lib/statuspages"
import { ExternalLink, RefreshCw } from "lucide-react"

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	logo: z.string().optional(),
	favicon: z.string().optional(),
	theme: z.enum(["light", "dark", "auto"] as const),
	custom_css: z.string().optional(),
	public: z.boolean(),
	show_uptime: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface StatusPageDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	page?: StatusPage | null
	isEdit?: boolean
}

export function StatusPageDialog({
	open,
	onOpenChange,
	page,
	isEdit = false,
}: StatusPageDialogProps) {
	const { toast } = useToast()
	const queryClient = useQueryClient()
	const [activeTab, setActiveTab] = useState("basic")

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			slug: "",
			title: "",
			description: "",
			logo: "",
			favicon: "",
			theme: "auto",
			custom_css: "",
			public: true,
			show_uptime: true,
		},
	})

	useEffect(() => {
		if (open && isEdit && page) {
			form.reset({
				name: page.name,
				slug: page.slug,
				title: page.title,
				description: page.description || "",
				logo: page.logo || "",
				favicon: page.favicon || "",
				theme: page.theme,
				custom_css: "",
				public: page.public,
				show_uptime: page.show_uptime,
			})
		} else if (open && !isEdit) {
			form.reset({
				name: "",
				slug: "",
				title: "",
				description: "",
				logo: "",
				favicon: "",
				theme: "auto",
				custom_css: "",
				public: true,
				show_uptime: true,
			})
		}
	}, [open, isEdit, page, form])

	const createMutation = useMutation({
		mutationFn: createStatusPage,
		onSuccess: () => {
			toast({ title: "Status page created successfully" })
			queryClient.invalidateQueries({ queryKey: ["status-pages"] })
			onOpenChange(false)
		},
		onError: (error: Error) => {
			toast({
				title: "Failed to create status page",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) =>
			updateStatusPage(id, data),
		onSuccess: () => {
			toast({ title: "Status page updated successfully" })
			queryClient.invalidateQueries({ queryKey: ["status-pages"] })
			onOpenChange(false)
		},
		onError: (error: Error) => {
			toast({
				title: "Failed to update status page",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const onSubmit = (data: FormData) => {
		if (isEdit && page) {
			updateMutation.mutate({ id: page.id, data })
		} else {
			createMutation.mutate(data)
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending

	// Auto-generate slug from name when creating new status page
	const lastAutoSlug = useRef<string>("")
	useEffect(() => {
		if (isEdit) return // Don't auto-generate in edit mode
		
		const subscription = form.watch((value, { name: fieldName }) => {
			if (fieldName === 'name') {
				const name = value.name || ''
				const currentSlug = form.getValues('slug') || ''
				const newSlug = generateSlug(name)
				
				// Only auto-generate if:
				// 1. Slug is empty, OR
				// 2. Current slug matches the last auto-generated slug (user hasn't manually edited)
				if (!currentSlug || currentSlug === lastAutoSlug.current) {
					form.setValue('slug', newSlug, { shouldValidate: true })
					lastAutoSlug.current = newSlug
				}
			}
		})
		return () => subscription.unsubscribe()
	}, [form, isEdit])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit Status Page" : "Create Status Page"}
					</DialogTitle>
					<DialogDescription>
						Configure a public status page to share your service status.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<Tabs value={activeTab} onValueChange={setActiveTab}>
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="basic">Basic</TabsTrigger>
								<TabsTrigger value="appearance">Appearance</TabsTrigger>
								<TabsTrigger value="advanced">Advanced</TabsTrigger>
							</TabsList>

							<TabsContent value="basic" className="space-y-4 mt-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input placeholder="My Services Status" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="slug"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="flex items-center justify-between">
												<span>URL Slug</span>
												{!isEdit && form.getValues('name') && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="h-6 px-2 text-xs"
														onClick={() => {
															const newSlug = generateSlug(form.getValues('name') || '')
															form.setValue('slug', newSlug, { shouldValidate: true })
															lastAutoSlug.current = newSlug
														}}
													>
														<RefreshCw className="mr-1 h-3 w-3" />
														Regenerate
													</Button>
												)}
											</FormLabel>
											<FormControl>
												<div className="flex items-center gap-2">
													<span className="text-sm text-muted-foreground whitespace-nowrap">/status/</span>
													<Input {...field} placeholder="my-services" className="flex-1" />
												</div>
											</FormControl>
											<FormDescription className="flex items-center justify-between">
												<span>Full URL: {typeof window !== 'undefined' ? window.location.origin : ''}{getStatusPageUrl(field.value)}</span>
												{field.value && (
													<a
														href={getStatusPageUrl(field.value)}
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary hover:underline inline-flex items-center gap-1"
														onClick={(e) => e.stopPropagation()}
													>
														<ExternalLink className="h-3 w-3" />
														Preview
													</a>
												)}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Page Title</FormLabel>
											<FormControl>
												<Input placeholder="Service Status Dashboard" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Description</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Real-time status of our services"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</TabsContent>

							<TabsContent value="appearance" className="space-y-4 mt-4">
								<FormField
									control={form.control}
									name="theme"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Theme</FormLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="light">Light</SelectItem>
													<SelectItem value="dark">Dark</SelectItem>
													<SelectItem value="auto">Auto (System)</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="logo"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Logo URL</FormLabel>
											<FormControl>
												<Input placeholder="https://example.com/logo.png" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="favicon"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Favicon URL</FormLabel>
											<FormControl>
												<Input placeholder="https://example.com/favicon.ico" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</TabsContent>

							<TabsContent value="advanced" className="space-y-4 mt-4">
								<FormField
									control={form.control}
									name="public"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-4">
											<div className="space-y-0.5">
												<FormLabel>Public Status Page</FormLabel>
												<FormDescription>
													Make this status page accessible without authentication
												</FormDescription>
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

								<FormField
									control={form.control}
									name="show_uptime"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-4">
											<div className="space-y-0.5">
												<FormLabel>Show Uptime Percentages</FormLabel>
												<FormDescription>
													Display uptime statistics on the status page
												</FormDescription>
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
								{isPending ? "Saving..." : isEdit ? "Update" : "Create"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
