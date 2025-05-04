import {
  Theneo,
  TheneoOptions,
  Result,
  ImportProjectOptions,
  ImportResponse,
  ApiDataInputOption,
} from "@theneo/sdk";

const options: TheneoOptions = {
  apiKey: "",
};

const theneo = new Theneo(options);

export async function importApiDocumentation(json: any) {
  const projectId = "68171af0602f132582c80d40";
  const list = await theneo.listProjectVersions(projectId);
  const lastVersion = list
    .unwrap()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const prjc = await theneo.createProjectVersion({
    name: `${Number(lastVersion.name) + 1}`,
    projectId,
    previousVersionId: lastVersion.id,
    isDefault: true,
    isNewVersion: true,
  });
  await theneo.publishProject(projectId, prjc.unwrap().id);

  const result: Result<ImportResponse> = await theneo.importProjectDocument({
    projectId,
    publish: true,
    versionId: prjc.unwrap().id,
    data: {
      text: JSON.stringify(json),
    } as ApiDataInputOption,
  });
  if (result.ok) {
    const importResponse: ImportResponse = result.unwrap();
    console.log("Imported API Documentation:", importResponse);
  } else {
    console.error("Error:", result.unwrap());
  }
}
