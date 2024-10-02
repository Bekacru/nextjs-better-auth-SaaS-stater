"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import { Loader2, PlusCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type ActionState = {
	error?: string;
	success?: string;
};

export function InviteTeamMember() {
	const [isInvitePending, setIsInvitePending] = useState(false);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"member" | "owner">("member");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string>("");
	return (
		<Card>
			<CardHeader>
				<CardTitle>Invite Team Member</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div>
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							name="email"
							type="email"
							placeholder="Enter email"
							required
							// disabled={!isOwner}
						/>
					</div>
					<div>
						<Label>Role</Label>
						<RadioGroup
							defaultValue="member"
							name="role"
							onValueChange={(value) => setRole(value as "member" | "owner")}
							className="flex space-x-4"
							// disabled={!isOwner}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="member" id="member" />
								<Label htmlFor="member">Member</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="owner" id="owner" />
								<Label htmlFor="owner">Owner</Label>
							</div>
						</RadioGroup>
					</div>
					{error && <p className="text-red-500">{error}</p>}
					{success && <p className="text-green-500">{success}</p>}
					<Button
						onClick={async () => {
							await authClient.organization.inviteMember(
								{
									email,
									role,
								},
								{
									onRequest() {
										setIsInvitePending(true);
										setError(null);
										setSuccess("");
									},
									onSuccess(ctx) {
										setIsInvitePending(false);
										setSuccess("Invited successfully!");
									},
									onError(context) {
										setError(context.error.message);
									},
								},
							);
						}}
						className="bg-orange-500 hover:bg-orange-600 text-white"
					>
						{isInvitePending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Inviting...
							</>
						) : (
							<>
								<PlusCircle className="mr-2 h-4 w-4" />
								Invite Member
							</>
						)}
					</Button>
				</div>
			</CardContent>
			{/* {!isOwner && (
				<CardFooter>
					<p className="text-sm text-muted-foreground">
						You must be a team owner to invite new members.
					</p>
				</CardFooter>
			)} */}
		</Card>
	);
}
