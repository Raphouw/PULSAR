// Fichier : app/segments/creator/page.tsx
import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import SegmentCreatorClient from "./SegmentCreatorClient";

export default async function SegmentCreatorPage() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || !session.user?.id) {
        redirect("/auth/signin");
    }

    return (
        <div style={{padding: '2rem', maxWidth: '1600px', margin: '0 auto'}}>
            <SegmentCreatorClient />
        </div>
    );
}

