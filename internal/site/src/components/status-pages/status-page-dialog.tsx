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
	type StatusPage,
} from "@/lib/statuspages"

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
											<FormLabel>URL Slug</FormLabel>
											<FormControl>
												<Input placeholder="my-services" {...field} />
											</FormControl>
											<FormDescription>
												The URL will be: /status/{field.value}
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
