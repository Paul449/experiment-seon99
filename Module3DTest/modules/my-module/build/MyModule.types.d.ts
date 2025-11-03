export type MyModuleEvents = {
    onChange: (params: {
        value: string;
    }) => void;
};
export type MyModuleViewProps = {
    url: string;
    onLoad: (event: {
        nativeEvent: {
            url: string;
        };
    }) => void;
    style?: any;
};
//# sourceMappingURL=MyModule.types.d.ts.map