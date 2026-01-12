export interface PackageType {
  code: any;
  id: number;
  name: string;
}

export const packageTypeOptions: PackageType[] = [
    { id: 97, name: "BOX" },
    { id: 57, name: "CARTON" },
    { id: 110, name: "CARGA GENERAL" }
];